class Import {
    constructor(fqcn, line, keyword, target) {
        this.fqcn = fqcn // string
        this.line = line // CodeLine
        this.keyword = keyword // Keyword
        this.target = target // Keyword

        this.fqcnParts = fqcn.split('\\') // []
        this.isFromGlobalNamespace = this.fqcnParts.length === 1
        // when importing a namespace instead of a class
        // will be set to true once this is detected from the usages
        this.isNamespaceImport = false
        this.usagesPopup = null
        this.lockPopup = false
    }

    static fromLineAndKeyword(line, keyword) {
        return new Import(
            keyword.target.text,
            line,
            keyword,
            keyword.target
        )
    }

    static getAllFromLines(lines) {
        return lines.reduce((result, line) => {
            let lineImports = line.keywords
                .filter(keyword => keyword.isImportKeyword)
                .map(keyword => Import.fromLineAndKeyword(line, keyword))

            result.push(...lineImports)

            return result
        }, [])
    }

    fetchUsages(codeLines, lastImportLineNumber) {
        this.usages = codeLines
            .filter(line => line.number > lastImportLineNumber)
            .reduce((result, line) => {
                let lineUsages = line.keywords.reverse().reduce((result, keyword) => {
                    let namespaceParts = keyword.text.split('\\')

                    // check if previous element is namespace
                    if (
                        this.getClass() === namespaceParts[0]
                        && result.previousKeyword
                        && !result.previousKeyword.domElement.innerHTML.match(/\w\\$/)
                    ) {

                        if (namespaceParts.length > 1) {
                            this.isNamespaceImport = true
                        }

                        result.usages.push(new ImportUsage(line, keyword))
                    }

                    result.previousKeyword = keyword

                    return result
                }, {
                    previousKeyword: null,
                    usages: []
                }).usages

                result.push(...lineUsages)

                return result
        }, [])
    }

    showUsagesPopup() {
        this.line.domElement.style.backgroundColor = 'yellow'
        this.usagesPopup.style.display = 'block'
    }

    hideUsagesPopup() {
        this.line.domElement.style.backgroundColor =  '#fff'
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
            + `<div style="font-weight: bold;">${this.usages.length} usage${this.usages.length > 1 ? 's' : ''}: </div>`
            + `<ul style="background: rgba(256,256,256,1)">${usagesPopupHtml}</ul>`
        popup.style.position = 'absolute'
        popup.style.display = 'none'
        popup.style.border = '1px solid black'
        popup.style.top = `${top}px`
        popup.style.left = `${left}px`
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
                !this.lockPopup
                && !popup.contains(event.toElement)
                // && !event.toElement.closest('#usage-popup')
            ) {
                this.hideUsagesPopup()
            }
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