chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if ( request.message !== 'global_import_clicked' ) {
            return;
        }

        let phpDocUrl

        if (request.className) {
            phpDocUrl = `https://www.php.net/manual/en/class.${request.className.toLowerCase()}`
            if (request.member) {
                phpDocUrl += `.${request.member.toLowerCase()}`
            }
        } else if (request.functionName) {
            let nameForUrl = request.functionName.replace(/_/g, '-')
            phpDocUrl = `https://www.php.net/manual/en/function.${nameForUrl}`
        } else if (request.constantName) {
            let cxId = '016738330692977400583:hp_y69xqeje'
            let googleApiKey = 'AIzaSyCAgpQN-zdJ4LokJ-u4o8UMBCtCjoehxsY'
            // let query = `site:https://www.php.net/manual/en/*.constants.php ${request.constantName}`
            let query = `${request.constantName}`


            let searchUrl = `https://www.googleapis.com/customsearch/v1?cx=${cxId}&key=${googleApiKey}&q=${query}`

            fetch(searchUrl).then((response) => {
                if (response.ok) {
                    response.json().then(json => {
                        let phpDocUrl = json.items[0].link + `#constant.${request.constantName.toLowerCase().replace(/_/g, '-')}`

                        chrome.tabs.create({
                            url: phpDocUrl,
                            active: true
                        })
                    })
                }
            })
            return
            // query google for the location

            // append hash to location
        }
        phpDocUrl += '.php'

        chrome.tabs.create({
            url: phpDocUrl,
            active: true
        })

        sendResponse({})
    }
);
