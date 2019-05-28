// Search for a page to go to when a recognized import is clicked
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if ( request.message !== 'import_clicked' ) {
            return;
        }

        // Get composer.json
        let cacheTag = createCacheTag(request.username, request.repository, request.branch)

        chrome.storage.local.get(cacheTag, (data) => {
            let cacheEntry = data[cacheTag]
            console.log(cacheEntry)

            if (typeof cacheEntry === 'undefined') {
                console.log(`No cache entry found for ${cacheTag}`)

                return
            }

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

function getFilenameFromFqcn(fqcn, ns, standard) {
    let location = fqcn
    // remove trailing slash
    if (standard === 'psr-4') {
        // remove the namespace from the start of the fully qualified class name
        let nsEscaped = ns.replace(/$\\/, '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        let removeNsRegex = new RegExp(`^${nsEscaped}`)

        location = location.replace(removeNsRegex, '')
    }


    // replace the separator
    let withForwardSlashes = location.replace(/\\/g, '\/',)

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
    let url
    let folder
    let filename

    if (lockJson) {
        let allPackages = [...lockJson.packages, ...lockJson['packages-dev']]
        let supportedPackages = allPackages.reduce((result, vendorPackage) => {
            if (typeof vendorPackage.autoload === 'undefined') {
                return result
            }
            if (typeof vendorPackage.autoload['psr-0'] !== 'undefined') {
                result.push(
                    ...Object.keys(vendorPackage.autoload['psr-0']).map(vendorNamespace => {
                        return {
                            standard: "psr-0",
                            namespace: vendorNamespace,
                            folder: vendorPackage.autoload['psr-0'][vendorNamespace],
                            repositoryUrl: vendorPackage.source.url
                        }
                    })
                )
            }

            if (typeof vendorPackage.autoload['psr-4'] !== 'undefined') {
                result.push(
                    ...Object.keys(vendorPackage.autoload['psr-4']).map(vendorNamespace => {
                        return {
                            standard: "psr-4",
                            namespace: vendorNamespace,
                            folder: vendorPackage.autoload['psr-4'][vendorNamespace],
                            repositoryUrl: vendorPackage.source.url
                        }
                    })
                )
            }

            return result
        }, [])

        let matchingPackage = supportedPackages.find(vendorPackage => fqcn.startsWith(vendorPackage.namespace))

        if (typeof matchingPackage !== 'undefined') {
            let filename = getFilenameFromFqcn(fqcn, matchingPackage.namespace, matchingPackage.standard)
            let githubUrl = matchingPackage.repositoryUrl.replace(/\.git$/, '')
            let folder = ''

            if (matchingPackage.folder.length > 0) {
                console.log(matchingPackage.folder)
                folder = `/${matchingPackage.folder.replace(/^\//, '')}`
            }

            return `${githubUrl}/blob/master${folder}/${filename}`
        }

        console.log('No package found in lock json.')
    }

    // Nothing in the packages or no lockJson so try this repo only with configJson

    if (!configJson) {
        // still have a shot if there are no files
        let defaultNamespace = '\\App'
        folder = 'src'
        filename = getFilenameFromFqcn(fqcn, defaultNamespace)
    } else {
        if ('autoload' in configJson) {
            if ('psr-4' in configJson.autoload) {
                Object.keys(configJson.autoload['psr-4']).forEach((ns) => {
                    console.log(ns)
                    if (fqcn.startsWith(ns)) {
                        folder = configJson.autoload['psr-4'][ns]
                        filename = getFilenameFromFqcn(fqcn, ns, 'psr-4')
                    }
                })
            }
            if (!filename && 'psr-0' in configJson.autoload) {
                Object.keys(configJson['autoload']['psr-0']).forEach((ns) => {
                    if (fqcn.startsWith(ns)) {
                        folder = configJson['autoload']['psr-0'][ns]
                        filename = getFilenameFromFqcn(fqcn, ns, 'psr-0')
                    }
                })
            }
        }

        if (!filename && 'autoload-dev' in configJson) {
            if ('psr-4' in configJson['autoload-dev']) {
                Object.keys(configJson['autoload-dev']['psr-4']).forEach((ns) => {
                    if (fqcn.startsWith(ns)) {
                        folder = configJson['autoload-dev']['psr-4'][ns]
                        filename = getFilenameFromFqcn(fqcn, ns, 'psr-4')
                    }
                })
            }
            if ('psr-0' in configJson['autoload-dev']) {
                Object.keys(configJson['autoload-dev']['psr-0']).forEach((ns) => {
                    if (fqcn.startsWith(ns)) {
                        folder = configJson['autoload-dev']['psr-0'][ns]
                        filename = getFilenameFromFqcn(fqcn, ns, 'psr-0')
                    }
                })
            }
        }
    }

    // Apparently people do this to have the autoloader look in multiple places,
    // but I don't won't to go in the effort to support that so we'll only check the first one (assuming that
    // the author was sensible enough to put the main folder as first)
    if (Array.isArray(folder)) {
        folder = folder[0]
    }

    if (filename) {
        let location = folder.replace(/^\//).replace(/\/$/, '')
        if (location.length > 0) {
            location = '/' + location
        }
        url = `https://github.com/${username}/${repository}/blob/${referencingBranch}${location}/${filename}`
    } else {
        // class also not found locally, just google it then
        url = `https://www.google.be/search?q=${fqcn}`
    }

    return url
}
