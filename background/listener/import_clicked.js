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
            let isNamespaceImport = request.isNamespaceImport
                && (!request.isClassImport || !request.preferClassImport)

            let url = lookupUrlForFqcn(
                request.fqcn,
                isNamespaceImport,
                cacheEntry.configJson,
                cacheEntry.lockJson,
                request.username,
                request.repository,
                request.branch,
                request.member
            )

            chrome.tabs.create({"url": url})

        })

        sendResponse({})
    }

);

function getFilenameFromFqcn(fqcn, vendorNamespace, standard, isNamespaceImport) {
    let location = fqcn
    // remove trailing slash
    if (standard === 'psr-4') {
        // remove the namespace from the start of the fully qualified class name
        let vendorNamespaceEscaped = vendorNamespace.replace(/$\\/, '').replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
        let removeVendorNsRegex = new RegExp(`^${vendorNamespaceEscaped}`)

        location = location.replace(removeVendorNsRegex, '')
    }


    // replace the separator
    let withForwardSlashes = location.replace(/\\/g, '\/',)

    if (!isNamespaceImport) {
        withForwardSlashes += '.php'
    }

    return withForwardSlashes
}

function lookupUrlForFqcn(
    fqcn,
    isNameSpaceImport,
    configJson,
    lockJson,
    username,
    repository,
    referencingBranch,
    classMember
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
            let filename = getFilenameFromFqcn(fqcn, matchingPackage.namespace, matchingPackage.standard, isNameSpaceImport)
            let githubUrl = matchingPackage.repositoryUrl.replace(/\.git$/, '')
            let folder = ''

            if (matchingPackage.folder.length > 0) {
                console.log(matchingPackage.folder)
                folder = `/${matchingPackage.folder.replace(/^\//, '')}`
            }

            return `${githubUrl}/blob/master${folder}/${filename}#blob-path`
        }

        console.log('No package found in lock json.')
    }

    // Nothing in the packages or no lockJson so try this repo only with configJson

    if (!configJson) {
        // still have a shot if there are no files
        let defaultNamespace = '\\App'
        folder = 'src'
        filename = getFilenameFromFqcn(fqcn, defaultNamespace, 'psr-4', isNameSpaceImport)
    } else {
        if ('autoload' in configJson) {
            if ('psr-4' in configJson.autoload) {
                Object.keys(configJson.autoload['psr-4']).forEach((ns) => {
                    console.log(ns)
                    if (fqcn.startsWith(ns)) {
                        folder = configJson.autoload['psr-4'][ns]
                        filename = getFilenameFromFqcn(fqcn, ns, 'psr-4', isNameSpaceImport)
                    }
                })
            }
            if (!filename && 'psr-0' in configJson.autoload) {
                Object.keys(configJson['autoload']['psr-0']).forEach((ns) => {
                    if (fqcn.startsWith(ns)) {
                        folder = configJson['autoload']['psr-0'][ns]
                        filename = getFilenameFromFqcn(fqcn, ns, 'psr-0', isNameSpaceImport)
                    }
                })
            }
        }

        if (!filename && 'autoload-dev' in configJson) {
            if ('psr-4' in configJson['autoload-dev']) {
                Object.keys(configJson['autoload-dev']['psr-4']).forEach((ns) => {
                    if (fqcn.startsWith(ns)) {
                        folder = configJson['autoload-dev']['psr-4'][ns]
                        filename = getFilenameFromFqcn(fqcn, ns, 'psr-4', isNameSpaceImport)
                    }
                })
            }
            if ('psr-0' in configJson['autoload-dev']) {
                Object.keys(configJson['autoload-dev']['psr-0']).forEach((ns) => {
                    if (fqcn.startsWith(ns)) {
                        folder = configJson['autoload-dev']['psr-0'][ns]
                        filename = getFilenameFromFqcn(fqcn, ns, 'psr-0', isNameSpaceImport)
                    }
                })
            }
        }
    }

    // Apparently you can have an array as the value to have the autoloader look in multiple places,
    // but I don't won't to go in the effort to support that, so we'll only check the first one (assuming that
    // the author was sensible enough to put the main folder first)
    if (Array.isArray(folder)) {
        folder = folder[0]
    }

    if (filename) {
        let location = folder.replace(/^\//).replace(/\/$/, '')
        if (location.length > 0) {
            location = '/' + location
        }
        url = `https://github.com/${username}/${repository}/blob/${referencingBranch}${location}/${filename}`
        if (classMember) {
            url += `#member=${classMember}`
        } else {
            // to show more of the file
            url += '#blob-path'
        }
    } else {
        // class also not found locally, just google it then
        url = `https://www.google.be/search?q=github ${fqcn}`
        if (classMember) {
            url += ` ${classMember}`
        }
    }

    return url
}
