chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if ( request.message !== 'global_import_clicked' ) {
            return;
        }

        let phpDocUrl = `https://www.php.net/manual/en/class.${request.className.toLowerCase()}`
        if (request.member) {
           phpDocUrl += `.${request.member.toLowerCase()}`
        }
        phpDocUrl+='.php'

        chrome.tabs.create({
            url: phpDocUrl,
            active: true
        })

        sendResponse({})
    }
);
