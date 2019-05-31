chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message !== "package_manager_cache_ready") {
        return
    }

    sourceFile.imports.forEach(fileImport => {
        let title
        let sendClickedMessage

        if (fileImport.isFromGlobalNamespace) {
            title = `Global import, click to go to https://www.php.net/manual/en/class.${fileImport.fqcn.toLowerCase()}.php`
            sendClickedMessage = () => {
                chrome.runtime.sendMessage({
                    message: 'global_import_clicked',
                    className: fileImport.fqcn
                })
            }
        } else {
            title = `click to search for source file for ${fileImport.fqcn}`
            sendClickedMessage = () => {
                chrome.runtime.sendMessage({
                    message: 'import_clicked',
                    fqcn: fileImport.fqcn,
                    isNamespaceImport: fileImport.isNamespaceImport,
                    username: sourceFile.username,
                    repository: sourceFile.repository,
                    branch: sourceFile.branch
                })
            }
        }

        fileImport.target.domElement.style.cursor = 'pointer'
        fileImport.target.domElement.addEventListener('mouseup', (event) => {
            if (event.which === 2 || event.which === 1) {
                sendClickedMessage()
            }
        })

        fileImport.getUsages().forEach(usage => {
            usage.keyword.domElement.setAttribute('title', `middle ${title}`)
            usage.keyword.domElement.style.fontWeight = 700
            usage.keyword.domElement.style.cursor = 'help'

            usage.keyword.domElement.addEventListener('mouseup', (event) => {
                if (event.which === 2) {
                    sendClickedMessage()
                }
            })
        })
    })

    sendResponse({})
})