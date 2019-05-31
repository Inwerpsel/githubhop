class CodeSymbol {
    constructor (text, domElement, line, isImport, targetSymbol) {
        this.text = text
        this.domElement = domElement
        this.line = line
        this.isImport= isImport
        this.targetSymbol = targetSymbol
        this.isClassSymbol = (this.text === 'class')
        this.isNamespaceSymbol = (this.text === 'namespace')
        this.namespaceParts = this.text.split('\\')
        this.isClassName = this.text.match(/^[A-Z][a-z]\w*$/)
        this.isInlineImport = this.namespaceParts[0] === '' // when first character of text is "\"
        this.namespacePrefixSymbol = null
        this.isFolder = this.text.match(/\w+\\$/)
    }

    // For now all symbols we are interested in reside inside of span, but some code may be just text
    static getAllFromLine(line, isAfterClassDeclaration) {
        let lineElements = [...line.domElement.querySelectorAll('span > span')]

        // reverse
        return lineElements.reverse().reduce((symbols, domElement) => {
            let isImport= false
            let importTarget = null

            if (!isAfterClassDeclaration && domElement.innerHTML === 'use') {
                let lastElementIndex = symbols.length - 1

                if (lastElementIndex > -1) {
                    let possibleFqcnSymbol = symbols[lastElementIndex]

                    if (possibleFqcnSymbol.text.match(/^\w+(\\\w+)*$/)) {
                        importTarget = possibleFqcnSymbol
                        isImport= true
                    }
                }
            }

            let symbol = new CodeSymbol(
                domElement.innerHTML,
                domElement,
                line,
                isImport,
                importTarget
            )

            if (symbol.isFolder) {
                let targetSymbol = symbols[symbols.length - 1]
                symbol.setTargetSymbol(targetSymbol)
                targetSymbol.setNamespacePrefixSymbol(symbol)
            }

            symbols.push(symbol)

            return symbols
        }, [])
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