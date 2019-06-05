chrome.contextMenus.create({
    id: 'searchInCurrentRepo',
    title: '_Search in current repository',
    documentUrlPatterns:[
        'https://github.com/*/*'
    ],
    contexts: [
        'selection'
    ]
})

chrome.contextMenus.onClicked.addListener(clickData => {
    if (clickData.menuItemId !== 'searchInCurrentRepo') {
        return
    }

    let pageUrl  = clickData.pageUrl

    if (!pageUrl) {
        return
    }

    let matches = pageUrl.match(/^https:\/\/github\.com\/([\w-_]+)\/([\w-_]+)/)

    if (matches === null) {
        return
    }

    let repoUrl = matches[0]

    let searchUrl = `${repoUrl}/search?q=${clickData.selectionText}`

    chrome.tabs.create({"url": searchUrl})

})