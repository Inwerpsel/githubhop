chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if ( request.message !== "imports_found" ) {
        return;
    }
    let cacheTag = createCacheTag(request.username, request.repository, request.branch)
    console.log(`Cache tag ${cacheTag}`)

    chrome.storage.local.get(cacheTag, (data) => {
        let branchUrl = `https://raw.githubusercontent.com/${request.username}/${request.repository}/${request.branch}`
        let configRawUrl = `${branchUrl}/composer.json`
        let lockRawUrl = `${branchUrl}/composer.lock`

        let entry = data[cacheTag]

        if (typeof entry !== 'undefined') {
            // TODO: check if cache is fresh in some way
            // configFileEtag =

            chrome.tabs.sendMessage(sender.tab.id, {message: "package_manager_cache_ready"}, function(response) {});

            return
        }

        // cache miss
        let configJson
        let lockJson

        Promise.all([
            fetch(configRawUrl)
                .catch((error) => {
                    console.log(error)
                })
                .then((response) => {
                    if (response.ok) {
                        return response.json()
                    }
                })
                .then((json) => {
                    configJson = json
                }),
            fetch(lockRawUrl)
                .catch((error) => {
                    console.log(error)
                })
                .then((response) => {
                    if (response.ok) {
                        return response.json()
                    }
                })
                .then((json) => {
                    lockJson = json
                })
        ]).then(() => {
            if (!configJson) {
                console.log('no config file found', configJson, lockJson)
            }
            chrome.storage.local.set({
                [cacheTag]: {configJson: configJson, lockJson: lockJson}
            })
            chrome.tabs.sendMessage(sender.tab.id, {message: 'package_manager_cache_ready'}, function (response) {})
        })
    })

    sendResponse({})
})