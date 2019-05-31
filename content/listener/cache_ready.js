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
            if (fileImport.isNamespaceImport && fileImport.isClassImport) {

            }
            sendClickedMessage = () => {
                let preferClassImport = false
                // fileImport.isClassImport
                // && fileImport.isNamespaceImport
                // && confirm('This namespace is both a class and a folder. \nConfirm to go to class, cancel to go to namespace folder')

                chrome.runtime.sendMessage({
                    message: 'import_clicked',
                    fqcn: fileImport.fqcn,
                    isNamespaceImport: fileImport.isNamespaceImport,
                    isClassImport: fileImport.isClassImport,
                    preferClassImport: preferClassImport,
                    username: sourceFile.username,
                    repository: sourceFile.repository,
                    branch: sourceFile.branch
                })
            }
        }

        fileImport.targetSymbol.domElement.style.cursor = 'pointer'
        fileImport.targetSymbol.domElement.addEventListener('mouseup', (event) => {
            if (event.which === 2 || event.which === 1) {
                sendClickedMessage()
            }
        })

        fileImport.getUsages().forEach(usage => {
            usage.symbol.domElement.setAttribute('title', `middle ${title}`)
            usage.symbol.domElement.style.fontWeight = 700
            usage.symbol.domElement.style.cursor = 'help'

            usage.symbol.domElement.addEventListener('mouseup', (event) => {

                if (event.which === 2) {
                    sendClickedMessage()
                }
            })
        })

        fileImport.subImports.forEach(subImport => {
            subImport.symbol.domElement.style.fontWeight = 700
            subImport.symbol.domElement.style.cursor = 'help'
            subImport.symbol.domElement.addEventListener('mouseup', event => {
                if (event.which === 2) {
                    chrome.runtime.sendMessage({
                        message: 'import_clicked',
                        fqcn: `${fileImport.fqcn}\\${subImport.subNamespace}`,
                        isNamespaceImport: subImport.isFolder,
                        isClassImport: !subImport.isNamespace,
                        preferClassImport: false,
                        username: sourceFile.username,
                        repository: sourceFile.repository,
                        branch: sourceFile.branch
                    })
                }
            })
        })
    })

    let importedNamespaces = sourceFile.imports.map(anImport => anImport.getClass())

    sourceFile.lines.forEach(line => {
        line.symbols.filter(symbol => symbol.isInlineImport).forEach(symbol => {
            symbol.domElement.style.fontWeight = '700'
            symbol.domElement.style.cursor = 'help'

            let fqcn

            if (symbol.targetSymbol) {
                fqcn = symbol.targetSymbol.text + symbol.text
            } else {
                fqcn = symbol.text
            }

            fqcn = fqcn.replace(/^\\/, '')

            symbol.domElement.addEventListener('mouseup', event => {
                if (fqcn.indexOf('\\') === -1) {
                    chrome.runtime.sendMessage({
                        message: 'global_import_clicked',
                        className: fqcn
                    })

                } else {
                    chrome.runtime.sendMessage({
                        message: 'import_clicked',
                        fqcn: fqcn,
                        isNamespaceImport: false,
                        isClassImport: true,
                        preferClassImport: true,
                        username: sourceFile.username,
                        repository: sourceFile.repository,
                        branch: sourceFile.branch
                    })
                }
            })
        })


        line.symbols.filter(
            symbol => symbol.isClassName
        ).forEach((symbol) => {
            let namespacePart
            if (symbol.hasNamespacePrefix()) {
                let firstPart = symbol.namespacePrefixSymbol.namespaceParts[0]

                if (importedNamespaces.includes(firstPart)) {
                    return
                }
                namespacePart = symbol.namespacePrefixSymbol.text + symbol.text
            } else if (!importedNamespaces.includes(symbol.text)) {
                namespacePart = symbol.text
            } else {
                return
            }

            symbol.domElement.style.fontWeight = 700
            symbol.domElement.cursor = 'pointer'
            symbol.domElement.addEventListener('mouseup', event => {
                if (event.which === 2) {
                    chrome.runtime.sendMessage({
                        message: 'ambiguous_inline_import_clicked',
                        namespacePart: namespacePart,
                        username: sourceFile.username,
                        currentUrl: window.location.href,
                        repository: sourceFile.repository,
                        branch: sourceFile.branch,
                        currentFileName: sourceFile.filename
                    })
                }
            })
        })
    })

    sendResponse({})
})