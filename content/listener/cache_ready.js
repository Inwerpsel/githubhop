chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message !== "package_manager_cache_ready") {
        return
    }
    let tStart = (new Date).getTime()

    sourceFile.imports.forEach(fileImport => {
        let title
        let sendClickedMessage

        if (fileImport.isFromGlobalNamespace) {
            title = `Global import, click to go to https://www.php.net/manual/en/class.${fileImport.fqcn.toLowerCase()}.php`
            sendClickedMessage = (member) => {
                chrome.runtime.sendMessage({
                    message: 'global_import_clicked',
                    className: fileImport.fqcn,
                    member: member
                })
            }
        } else {
            title = `click to search for source file for ${fileImport.fqcn}`
            // if (fileImport.isNamespaceImport && fileImport.isClassImport) {
            //
            // }
            sendClickedMessage = (member, isParentClass) => {
                let preferClassImport = false
                if (isParentClass) {
                    let memberParam = window.location.hash.split('member=')[1]
                    if (memberParam) {
                        member = memberParam
                    }
                } else if (typeof member === 'undefined' || !member) {
                    member = false
                }
                // fileImport.isClassImport
                // && fileImport.isNamespaceImport
                // && confirm('This namespace is both a class and a folder. \nConfirm to go to class, cancel to go to namespace folder')

                chrome.runtime.sendMessage({
                    message: 'import_clicked',
                    fqcn: fileImport.fqcn,
                    member: member,
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
            if (usage.isMemberAccess) {
                let textNode = usage.symbol.targetSymbol.domElement.nextSibling
                let span = document.createElement('span')
                let memberName = textNode.textContent.replace(/\(.*$/, '')
                span.innerHTML = textNode.textContent
                span.setAttribute('title', `${title}::${memberName}`)
                // span.style.fontWeight = 700
                span.style.cursor = 'help'
                span.addEventListener('click', () => {
                    sendClickedMessage(memberName)
                })
                textNode.parentNode.insertBefore(span, textNode)
                textNode.parentNode.removeChild(textNode)
            }
            usage.symbol.domElement.setAttribute('title', `${title}`)
            // usage.symbol.domElement.style.fontWeight = 700
            usage.symbol.domElement.style.cursor = 'help'

            usage.symbol.domElement.addEventListener('click', () => {
                sendClickedMessage(false, usage.isParentClass)
            })

        })

        fileImport.subImports.forEach(subImport => {
            // subImport.symbol.domElement.style.fontWeight = 700
            subImport.symbol.domElement.style.cursor = 'help'
            subImport.symbol.domElement.title = `subImport: ${subImport.fqcn}`
            subImport.symbol.domElement.addEventListener('click', () => {
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
            })
        })
    })

    let importedNamespaces = sourceFile.imports.map(anImport => anImport.getClass())

    sourceFile.inlineImports.forEach(inlineImport => {
        // inlineImport.symbol.domElement.style.fontWeight = '700'
        inlineImport.symbol.domElement.style.cursor = 'help'
        inlineImport.symbol.domElement.title = 'inline import'


        let clickListener = () => {
            if (inlineImport.isGlobalImport) {
                chrome.runtime.sendMessage({
                    message: 'global_import_clicked',
                    className: inlineImport.fqcn
                })
            } else {
                chrome.runtime.sendMessage({
                    message: 'import_clicked',
                    fqcn: inlineImport.fqcn,
                    isNamespaceImport: false,
                    isClassImport: true,
                    preferClassImport: true,
                    username: sourceFile.username,
                    repository: sourceFile.repository,
                    branch: sourceFile.branch
                })
            }
        }
        inlineImport.symbol.domElement.addEventListener('click', clickListener)

        if (inlineImport.targetSymbol) {
            // inlineImport.targetSymbol.domElement.style.fontWeight = '700'
            inlineImport.targetSymbol.domElement.style.cursor = 'help'
            inlineImport.targetSymbol.domElement.title = 'inline import target'
            inlineImport.targetSymbol.domElement.addEventListener('click', clickListener)
        }
    })

    let functionListener = (functionName) => {
        chrome.runtime.sendMessage({
            message: 'global_import_clicked',
            functionName: functionName
        })
    }

    let constantListener = (constantName) => {
        chrome.runtime.sendMessage({
            message: 'global_import_clicked',
            constantName: constantName
        })
    }

    let isPastClass = false // to avoid having to call getClassSymbol on each line
    sourceFile.getLinesAfterLastImport().forEach(line => {
        let isClass = isPastClass && line.getClassSymbol()
        isPastClass = isPastClass && isClass
        line.symbols.forEach((symbol) => {
            if (symbol.isInlinePrefixed) {
                return
            }
            if (symbol.isFunction) {
                // symbol.domElement.style.fontWeight = '700'
                symbol.domElement.style.cursor = 'help'
                symbol.domElement.title = 'inline global function usage'
                symbol.domElement.addEventListener('click', () => {functionListener(symbol.text)})
                return
            }

            if (symbol.isConstant) {
                // symbol.domElement.style.fontWeight = '700'
                symbol.domElement.style.cursor = 'help'
                symbol.domElement.title = 'inline global constant usage'
                symbol.domElement.addEventListener('click', () => {constantListener(symbol.text)})
                return
            }

            if ((!symbol.isSelf && !symbol.isClassName) || isClass) {
                return
            }
            let namespacePart
            if (symbol.hasNamespacePrefix()) {
                let firstPart = symbol.namespacePrefixSymbol.namespaceParts[0]

                if (importedNamespaces.includes(firstPart)) {
                    return
                }
                namespacePart = symbol.namespacePrefixSymbol.text + symbol.text
            } else if (symbol.isSelf) {
                namespacePart = sourceFile.currentClass
            } else if (!importedNamespaces.includes(symbol.text)) {
                namespacePart = symbol.text
            } else {
                return
            }

            let ambiguousEventListener = (member, isParentClass) => {

                if (isParentClass) {
                    let memberParam = window.location.hash.split('member=')[1]
                    if (memberParam) {
                        member = memberParam
                    }
                }

                chrome.runtime.sendMessage({
                    message: 'ambiguous_inline_import_clicked',
                    namespacePart: namespacePart,
                    member: member,
                    username: sourceFile.username,
                    currentUrl: window.location.href,
                    repository: sourceFile.repository,
                    branch: sourceFile.branch,
                    currentFileName: sourceFile.filename
                })
            }

            if (symbol.targetSymbol && (symbol.targetSymbol.isStaticAccessor || symbol.targetSymbol.isAccessor)) {
                let textNode = symbol.targetSymbol.domElement.nextSibling
                let span = document.createElement('span')
                let memberName = textNode.textContent.replace(/\(.*$/, '')
                span.innerHTML = textNode.textContent
                span.setAttribute('title', `implicit ${namespacePart} member ${memberName}`)
                // span.style.fontWeight = 700
                span.style.cursor = 'help'
                span.addEventListener('click', () => {
                    ambiguousEventListener(memberName, false)
                })
                textNode.parentNode.insertBefore(span, textNode)
                textNode.parentNode.removeChild(textNode)

            }

            // symbol.domElement.style.fontWeight = 700
            symbol.domElement.style.cursor = 'help'
            symbol.domElement.title = 'implicit ' + namespacePart
            symbol.domElement.addEventListener('click', ()=> {ambiguousEventListener(false, symbol.isParentClass)})
        })
    })

    console.log(`${(new Date).getTime() - tStart} ms for attaching links`)

    sendResponse({})
})