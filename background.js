let composerCache = {}

function getComposerFiles (username, repository, branch, callback) {
    let cacheTag = username + repository + branch

    if (cacheTag in composerCache) {
        cache = composerCache[cacheTag]
        console.log('got json from cache: ' + cacheTag)
        callback(cache.jsonJson, cache.lockJson)
        return
    }

    let jsonRawUrl = `https://raw.githubusercontent.com/${username}/${repository}/${branch}/composer.json`
    let lockRawUrl = `https://raw.githubusercontent.com/${username}/${repository}/${branch}/composer.lock`

    let jsonJson
    let lockJson

    console.log('fetching composer.json from github raw: ' + jsonRawUrl)
    let jsonRequest = new XMLHttpRequest();
    jsonRequest.open("GET", jsonRawUrl, true); // true for asynchronous 
    jsonRequest.onload = function (e) {
        console.log('fetched url: ' + jsonRawUrl)
        if (jsonRequest.responseText === '404: Not Found\n') {
            console.log('No composer.json file found at ' + jsonRawUrl)

            composerCache[cacheTag] = {jsonJson: null, lockJson: null}

            return
        }
        jsonJson = JSON.parse(jsonRequest.responseText)

        lockRequest = new XMLHttpRequest();
        lockRequest.open('GET', lockRawUrl, true);
        lockRequest.onload = function (e) {
            if (lockRequest.responseText === '404: Not Found\n') {
                console.log('No composer.lock file found at ' + lockRawUrl)
                composerCache[cacheTag] = {jsonJson: jsonJson, lockJson: null}
                return callback(jsonJson, null)
            }

            lockJson = JSON.parse(lockRequest.responseText)
            // TODO: Probably better to not store the entire json in cache, but only the parts needed
            composerCache[cacheTag] = {jsonJson: jsonJson,lockJson: lockJson}
            callback(jsonJson, lockJson)
        }
        lockRequest.send(null)

    }
    jsonRequest.send(null)
}

function getFilenameFromFqcn(fqdn, ns) {
    fileOnly = fqdn.replace(ns, '')
    withForwardSlashes = fileOnly.replace(/\\/g, '\/',)

    withoutLeadingSlash = withForwardSlashes.replace(/^\//, '')
    return withForwardSlashes + '.php'
}

// Search for a page to go to when a recognized import is clicked
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if ( request.message !== "import_clicked" ) {
            return;
        }

        // Get composer.json

        getComposerFiles(request.username, request.repository, request.branch, function (jsonJson, lockJson) {

            let filename
            let url
            let folder

            if (lockJson) {
                let allPackages = [ ...lockJson.packages, ...lockJson['packages-dev'] ];
                allPackages.forEach( (package) => {
                    if (
                        typeof package.autoload === 'undefined'
                        || typeof package.autoload['psr-4'] === 'undefined'
                    ) {
                        return;
                    }
                    for (packageNs in package.autoload['psr-4']) {
                        // check if file fqcn starts with this namespace
                        if (request.fqcn.startsWith(packageNs)) {
                            console.log(package)

                            folder = package.autoload['psr-4'][packageNs]
                            filename = getFilenameFromFqcn(request.fqcn, packageNs)
                            // perhaps we could determine the branch or tag for the package as well
                            let baseUrl = package.source.url.replace(/\.git$/, '')
                            url = `${baseUrl}/blob/master/${folder}/${filename}`
                        }
                    }
                })
            }

            // Nothing in the packages so try this repo
            if (!url) {
                if (jsonJson) {
                    if ('psr-4' in jsonJson.autoload) {
                        Object.keys(jsonJson.autoload['psr-4']).forEach( (ns) => {
                            console.log(ns)
                            if (request.fqcn.startsWith(ns)) {
                                folder = jsonJson.autoload['psr-4'][ns]
                                filename = getFilenameFromFqcn(request.fqcn, ns)
                            }
                        })
                    }
                    if ('autoload-dev' in jsonJson && 'psr-4' in jsonJson['autoload-dev']) {
                        Object.keys(jsonJson['autoload-dev']['psr-4']).forEach( (ns) => {
                            if (request.fqcn.startsWith(ns)) {
                                folder = jsonJson['autoload-dev'][ns]
                                filename = getFilenameFromFqcn(request.fqcn, ns)
                            }
                        })
                    }
                } else {
                    // still have a shot if there are no files
                    folder = 'src'
                    let defaultNamespace = '\\App'
                    filename = getFilenameFromFqcn(request.fqcn, defaultNamespace)
                }

                if (filename) {
                    url = `https://github.com/${request.username}/${request.repository}/blob/master/${folder.replace(/\/$/, '')}/${filename}`
                }
            }

            if (!url) {
                url = `https://www.google.be/search?q=${request.fqcn}`
            }

            chrome.tabs.create({"url": url});
        })
    }
);
