class Import {
    constructor(fqcn, line, symbol, targetSymbol) {
        this.fqcn = fqcn // string
        this.line = line // CodeLine
        this.symbol = symbol
        this.targetSymbol = targetSymbol

        this.usages = null
        this.subImports = null

        this.fqcnParts = targetSymbol.namespaceParts
        this.isFromGlobalNamespace = this.fqcnParts.length === 1
        // when importing a namespace instead of a class
        // will be set to true once this is detected from the usages
        this.isNamespaceImport = false
        this.isClassImport = false
        this.usagesPopup = null
        this.lockPopup = false
    }

    static fromLineAndSymbol(line, symbol) {
        return new Import(
            symbol.targetSymbol.text,
            line,
            symbol,
            symbol.targetSymbol
        )
    }

    static getAllFromLines(lines) {
        return lines.reduce((result, line) => {
            let importSymbols = line.symbols.filter(symbol => symbol.isImport)
            let lineImports = importSymbols.map(symbol => Import.fromLineAndSymbol(line, symbol))

            result.push(...lineImports)

            return result
        }, [])
    }

    fetchUsagesAndSubImports(sourceFile) {
        let linesAfterLastImport = sourceFile.getLinesAfterLastImport()

        let {usages, subImports} = linesAfterLastImport.reduce((result, line) => {
            let lineResult = this.findUsagesAndSubImportsInLine(line)

            result.usages.push(...lineResult.usages)
            result.subImports.push(...lineResult.subImports)

            return result
        }, {
            usages: [],
            subImports: []
        })

        this.usages = usages
        this.subImports = subImports
    }

    findUsagesAndSubImportsInLine(line) {
        let lineSymbols = line.symbols

        return lineSymbols.reduce((result, symbol, index) => {
            let namespaceParts = symbol.namespaceParts
            let nextSymbol = lineSymbols[index + 1]

            // check if previous element is namespace
            if (
                !symbol.isInlinePrefixed
                && this.getClass() === namespaceParts[0]
                && (!nextSymbol || !nextSymbol.isFolder)
            ) {
                if (typeof nextSymbol !== 'undefined' && (nextSymbol.isClassName || nextSymbol.isFolder)) {
                    let classSymbol = nextSymbol.isClassName ? nextSymbol : lineSymbols[index - 2]

                    result.subImports.push(new SubImport(this, classSymbol.text, classSymbol, false))

                    if (nextSymbol.isFolder) {
                        let folderImports = nextSymbol.namespaceParts.map(
                            namespacePart => {
                                let removePartRegex = new RegExp(`^${namespacePart}`)
                                nextSymbol.domElement.innerHTML = nextSymbol.domElement.innerHTML.replace(removePartRegex, '')
                                let span = document.createElement('span')
                                span.innerHTML = namespacePart
                                nextSymbol.domElement.prependChild(span)

                                return new SubImport(this, namespacePart, span, true)
                            }
                        )
                        result.subImports.push(...folderImports)
                    }
                }

                if (namespaceParts.length > 1) {
                    this.isNamespaceImport = true
                } else {
                    this.isClassImport = true
                }

                result.usages.push(new ImportUsage(line, symbol))
            }

            return result
        }, {
            usages: [],
            subImports: []
        })
    }

    showUsagesPopup() {
        this.line.domElement.style.backgroundColor = 'yellow'
        this.usagesPopup.style.display = 'block'
    }

    hideUsagesPopup() {
        this.line.domElement.style.backgroundColor = '#fff'
        this.usagesPopup.style.display = 'none'
    }

    getClass() {
        return this.fqcnParts[this.fqcnParts.length - 1]
    }

    getUsages() {
        return this.usages
    }

    generateUsagesPopup(left) {
        let usagesPopupHtml = this.usages.reduce(
            (html, usage) => html +
                `<li style="white-space: nowrap">`
                + `<a href="#L${usage.line.number}">`
                + `<div style="display: inline-block; width: 60px">${usage.line.number}</div>`
                + `<span>${usage.line.domElement.innerHTML}</span>`
                + `</a>`
                + `</li>`,
            ''
        )

        let top = this.line.domElement.getBoundingClientRect().top + document.documentElement.scrollTop

        if (usagesPopupHtml.length === 0) {
            return
        }

        let popup = document.createElement('div')
        popup.className = 'usages-popup'
        popup.style.resize = 'both'
        popup.innerHTML =
            '<button class="lock-popup" style="font-size: 12px; height: 18px; position: absolute; left: 0">lock</button>'
            + `<div style="font-weight: bold;">${this.usages.length} occurrence${this.usages.length > 1 ? 's' : ''}: of ${this.fqcn}</div>`
            + `<ul style="background: rgba(256,256,256,1)">${usagesPopupHtml}</ul>`
        popup.style.position = 'absolute'
        popup.style.display = 'none'
        popup.style.border = '1px solid black'
        popup.style.top = `${top + 10}px`
        popup.style.left = `${left + 30}px`
        popup.style.background = 'rgba(256,256,256,1)'
        popup.style.maxHeight = '600px'
        popup.style.width = '900px'
        popup.style.overflow = 'scroll'
        popup.style.paddingLeft = '50px'
        popup.style.paddingBottom = '20px'

        this.usagesPopup = popup
        this.line.domElement.closest('body').appendChild(popup)


        popup.addEventListener('mouseleave', () => {
            if (
                !this.lockPopup
                && event.toElement !== this.line.domElement
            ) {
                this.hideUsagesPopup()
            }
        })

        this.line.domElement.addEventListener('mouseover', () => {
            this.showUsagesPopup()
        })

        this.line.domElement.addEventListener('mouseleave', (event) => {
            if (
                this.lockPopup
                || !event.toElement
                || event.toElement.className === 'usages-popup'
                || popup.contains(event.toElement)
            ) {
                return
            }
            this.hideUsagesPopup()
        })

        let lockButton = popup.querySelector('.lock-popup')

        let toggleLockPopup = () => {
            this.lockPopup = !this.lockPopup
            popup.draggable = this.lockPopup
            if (this.lockPopup) {
                lockButton.innerHTML = 'unlock'
                popup.style.position = 'fixed'
                popup.style.top = 'auto'
                popup.style.left = 'auto'
                popup.style.right = 0
                popup.style.bottom = 0
            } else {
                lockButton.innerHTML = 'lock'
                popup.style.position = 'absolute'
                popup.style.top = `${top}px`
                popup.style.left = `${left}px`
                popup.style.right = 'auto'
                popup.style.bottom = 'auto'
            }
        }

        lockButton.addEventListener('click', (event) => {
            if (!event.target.matches('a *')) {
                toggleLockPopup()
            }
        })
    }
}