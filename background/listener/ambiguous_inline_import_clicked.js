
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if ( request.message !== 'ambiguous_inline_import_clicked' ) {
            return;
        }


        let withoutHashAndQuery = request.currentUrl.replace(/#.*$/, '').replace(/\?.*$/, '')

        let currentFileFolderUrl = withoutHashAndQuery.replace(
            /\w*\.php$/, ''
        )

        let possibleUrl = currentFileFolderUrl + request.namespacePart + '.php'

        possibleUrl +=
            request.member
                ? '#member=' + request.member
                : '#blob-path'

        chrome.tabs.create({
            url: possibleUrl,
            active: true
        })

        // let phpDocUrl = `https://www.php.net/manual/en/class.${request.className.toLowerCase()}.php`
        //
        // chrome.tabs.create({
        //     url: phpDocUrl,
        //     active: true
        // })

        sendResponse({})

    }
);
