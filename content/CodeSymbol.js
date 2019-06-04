class CodeSymbol {
    static classTypes = ['class', 'interface', 'trait']

    static reservedKeywords = [
        ...CodeSymbol.classTypes,
        'if', 'else', 'true', 'false', 'null', 'function', 'public', 'static', 'private', 'return', 'const', 'bool', 'int', 'string', 'as', 'instanceof'
    ]

    constructor (text, domElement, line, isImport, targetSymbol) {
        this.text = text
        this.domElement = domElement
        this.line = line
        this.isImport= isImport
        this.targetSymbol = targetSymbol

        this.namespaceParts = this.text.split('\\')
        this.isInlineImport = false
        this.isFolder = false
        this.isFunction = false
        this.isConstant = false
        this.isAs = false

        if (this.text.match(/^[A-Z][a-z]\w*$/)) {
            this.isClassName = true

        } else if (this.text.match(/\w+\\$/)) {
            this.isFolder = true

        } else if (this.text === '->') {
            this.isAccessor = true

        } else if (this.text === '::') {
            this.isStaticAccessor = true

        } else if (this.text === 'self') {
            this.isSelf = true

        } else if (this.namespaceParts[0] === '') {
            this.isInlineImport = true

        // } else if (this.text === 'namespace') {
        //     this.isNamespaceSymbol = true

        } else if (CodeSymbol.classTypes.includes(this.text)) {
            this.isClassSymbol = true

        } else if (
            text.match(/^[a-z][a-z0-9_]+$/)
            && !CodeSymbol.reservedKeywords.includes(text)
        ) {
            this.isFunction = true

        } else if (
            text.match(/^[A-Z][A-Z_0-9]+$/)
        ) {
            this.isConstant = true
        }

        this.namespacePrefixSymbol = null
        this.isInlinePrefixed = false
    }

    // For now all symbols we are interested in reside inside of span, but some code may be just text
    static getAllFromLine(line, isAfterClassDeclaration) {
        let lineElements = [...line.domElement.querySelectorAll('td > span > span')]

        // reverse
        return lineElements.reverse().reduce((symbols, domElement) => {
            let isImport= false
            let importTarget = null

            let nextSymbol = symbols[symbols.length - 1]

            let text = domElement.textContent

            if (!isAfterClassDeclaration && text === 'use') {
                let lastElementIndex = symbols.length - 1

                if (lastElementIndex > -1) {
                    if (nextSymbol.text.match(/^\w+(\\\w+)*$/)) {
                        importTarget = nextSymbol
                        isImport= true
                    }
                }
            }

            let symbol = new CodeSymbol(
                text,
                domElement,
                line,
                isImport,
                importTarget
            )

            if (nextSymbol && symbol.isFolder) {
                symbol.setTargetSymbol(nextSymbol)
                nextSymbol.setNamespacePrefixSymbol(symbol)
            } else if (nextSymbol && symbol.isClassSymbol) {
                symbol.targetSymbol = nextSymbol
            } else if (nextSymbol && symbol.isInlineImport && nextSymbol.isClassName) {
                symbol.targetSymbol = nextSymbol
                nextSymbol.markAsInlinePrefixed()
            } else if (symbol.text === 'as') {
                symbol.isAs = true
                symbol.targetSymbol = nextSymbol
            } else if (nextSymbol && nextSymbol.isAs) {
                symbol.targetSymbol = nextSymbol
            }

            if (symbol.isAccessor && nextSymbol) {
                nextSymbol.isFunction = false
            }

            if (nextSymbol && nextSymbol.isStaticAccessor) {
                symbol.targetSymbol = nextSymbol
            }

            symbols.push(symbol)

            return symbols
        }, [])
    }

    markAsInlinePrefixed() {
        this.isInlinePrefixed = true
    }

    hasNamespacePrefix() {
        return this.namespacePrefixSymbol !== null
    }

    setTargetSymbol(targetSymbol) {
        this.targetSymbol = targetSymbol
    }

    setNamespacePrefixSymbol(symbol) {
        this.namespacePrefixSymbol = symbol
    }
}