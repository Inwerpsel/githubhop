function createCacheTag(username, repository, branch) {
    return `${username}/${repository}/${branch}`
}

function getFilenameFromFqcn(fqcn, ns) {
    // remove trailing slash
    let nsEscaped = ns.replace(/$\\/, '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')

    // remove the namespace from the start of the fully qualified class name
    let removeNsRegex = new RegExp(`^${nsEscaped}`)
    let fileOnly = fqcn.replace(removeNsRegex, '')

    // replace the separator
    let withForwardSlashes = fileOnly.replace(/\\/g, '\/',)

    return withForwardSlashes + '.php'
}

function lookupUrlForFqcn(
    fqcn, 
    configJson, 
    lockJson, 
    username, 
    repository, 
    referencingBranch
) {

    let filename
    let url
    let folder
    let branch = 'master'

    if (lockJson) {
        let allPackages = [ ...lockJson.packages, ...lockJson['packages-dev'] ];
        for (package in allPackages) {
            if (
                typeof package.autoload === 'undefined'
                || typeof package.autoload['psr-4'] === 'undefined'
            ) {
                continue;
            }
            for (packageNs in package.autoload['psr-4']) {
                // check if file fqcn starts with this namespace
                if (fqcn.startsWith(packageNs)) {
                    console.log(package)

                    folder = package.autoload['psr-4'][packageNs]
                    filename = getFilenameFromFqcn(fqcn, packageNs)
                    // perhaps we could determine the branch or tag for the package as well
                    let baseUrl = package.source.url.replace(/\.git$/, '')

                    return `${baseUrl}/blob/master/${folder}/${filename}`
                }
            }
        }
    }

    // Nothing in the packages so try this repo
    if (configJson) {
        if ('psr-4' in configJson.autoload) {
            Object.keys(configJson.autoload['psr-4']).forEach( (ns) => {
                console.log(ns)
                if (fqcn.startsWith(ns)) {
                    folder = configJson.autoload['psr-4'][ns]
                    filename = getFilenameFromFqcn(fqcn, ns)
                }
            })
        }
        if (
            !filename    
            && 'autoload-dev' in configJson 
            && 'psr-4' in configJson['autoload-dev']
        ) {
            Object.keys(configJson['autoload-dev']['psr-4']).forEach( (ns) => {
                if (fqcn.startsWith(ns)) {
                    folder = configJson['autoload-dev'][ns]
                    filename = getFilenameFromFqcn(fqcn, ns)
                }
            })
        }
        branch = referencingBranch
    } else {
        // still have a shot if there are no files
        folder = 'src'
        let defaultNamespace = '\\App'
        filename = getFilenameFromFqcn(fqcn, defaultNamespace)
    }

    if (filename) {
        url = `https://github.com/${username}/${repository}/blob/${branch}/${folder.replace(/\/$/, '')}/${filename}`
    } else {
        url = `https://www.google.be/search?q=${fqcn}`
    }

    return url
}

// Search for a page to go to when a recognized import is clicked
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if ( request.message !== 'import_clicked' ) {
            return;
        }

        // Get composer.json
        let cacheTag = createCacheTag(request.username, request.repository, request.branch)

        chrome.storage.local.get(cacheTag, (data) => {
            cacheEntry = data[cacheTag]
            if (typeof cacheEntry === 'undefined') {
                console.log(`No cache entry found for ${cacheTag}`)

                return
            }
            let configJson = cacheEntry.configJson
            let lockJson = cacheEntry.lockJson

            let url = lookupUrlForFqcn(
                request.fqcn,
                cacheEntry.configJson,
                cacheEntry.lockJson,
                request.username,
                request.repository,
                request.branch
            )

            chrome.tabs.create({"url": url});
        })

        sendResponse({})
    }

);

// TODO: use chained promises
chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if ( request.message !== "imports_found" ) {
        return;
    }
    let cacheTag = createCacheTag(request.username, request.repository, request.branch)

    chrome.storage.local.get(cacheTag, (data) => {
        let branchUrl = `https://raw.githubusercontent.com/${request.username}/${request.repository}/${request.branch}`
        let configRawUrl = `${branchUrl}/composer.json`
        let lockRawUrl = `${branchUrl}/composer.lock`

        console.log(`Cache tag ${cacheTag}`)
        let entry = data[cacheTag]

        if (typeof entry !== 'undefined') {
            console.log(`Cache hit for ${cacheTag}`)
            // TODO: don't replace it if cache is fresh

            // configFileEtag = 

            chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                chrome.tabs.sendMessage(tabs[0].id, {message: "package_manager_cache_ready"}, function(response) {});  
            });

            return
        }
        // cache miss
        let configJson
        let lockJson

        console.log('fetching package manager config file from github raw: ' + configRawUrl)
        let configRequest = new XMLHttpRequest();
        configRequest.open("GET", configRawUrl, true); // true for asynchronous 
        configRequest.onload = function (e) {
            console.log('fetched url: ' + configRawUrl)
            // this works for now...
            if (configRequest.responseText === '404: Not Found\n') {
                console.log('No config file found at ' + configRawUrl)

                chrome.storage.local.set({
                    [cacheTag]: {configJson: null, lockJson: null}
                })

                chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                    chrome.tabs.sendMessage(tabs[0].id, {message: "package_manager_cache_ready"}, function(response) {});  
                });

                return
            }
            configJson = JSON.parse(configRequest.responseText)

            lockRequest = new XMLHttpRequest();
            lockRequest.open('GET', lockRawUrl, true);
            lockRequest.onload = function (e) {
                if (lockRequest.responseText === '404: Not Found\n') {
                    console.log('No lock file found at ' + lockRawUrl)
                    chrome.storage.local.set({
                         [cacheTag]: {configJson: configJson, lockJson: null}
                    })

                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                        chrome.tabs.sendMessage(tabs[0].id, {message: "package_manager_cache_ready"}, function(response) {});  
                    });
 
                    return 
                }

                lockJson = JSON.parse(lockRequest.responseText)
                // TODO: Probably better to not store the entire json in cache, but only the parts needed
                chrome.storage.local.set({
                    [cacheTag]: {configJson: configJson,lockJson: lockJson}
                })

                chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                    chrome.tabs.sendMessage(tabs[0].id, {message: "package_manager_cache_ready"}, function(response) {});  
                });
            }
            lockRequest.send(null)

        }
        configRequest.send(null)
        
    })

    sendResponse({})
})