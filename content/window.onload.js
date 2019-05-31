let sourceFile

(function () {
    try {
        sourceFile = SourceFile.fromUrlAndDocument(window.location.href, document)
    } catch (error) {
        if (error === 'location not github file') {
            console.log(error)

            return
        } else if (error === 'extension not supported') {
            console.log(`extension not supported for ${window.location.href}`)

            return
        } else {
            throw error
        }
    }

    if (sourceFile.imports.length === 0) {
        return
    }

    chrome.runtime.sendMessage({
        "message": "imports_found",
        "username": sourceFile.username,
        "repository": sourceFile.repository,
        "branch": sourceFile.branch
    })

    sourceFile.fetchImportUsages()
})()