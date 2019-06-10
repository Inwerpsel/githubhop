class CodeSymbol {
    static classTypes = ['class', 'interface', 'trait']

    static reservedKeywords = [
        ...CodeSymbol.classTypes,
        'if', 'else', 'true', 'false', 'null', 'function', 'public', 'protected', 'extends', 'static', 'private', 'return', 'const', 'bool', 'int', 'string', 'as', 'instanceof', 'parent', 'foreach', 'for', 'use', 'break', 'continue', 'while', 'array', 'new', 'static', 'implements', 'abstract', 'switch', 'case', 'clone'
    ]

    static selfReferences = ['self', 'static', '$this']

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
        this.isFunctionKeyword = false
        this.isConstKeyword = false
        this.isParentClass = false
        this.isAnnotation = false

        if (this.text.match(/^[A-Z]+[a-z]\w*$/)) {
            this.isClassName = true

        } else if (this.text.match(/\w+\\$/)) {
            this.isFolder = true

        } else if (this.text === '->') {
            this.isAccessor = true

        } else if (this.text === '::') {
            this.isStaticAccessor = true

        } else if (CodeSymbol.selfReferences.includes(this.text)) {
            this.isSelf = true

        } else if (this.text === 'self' || this.text === 'static' || this.text === '$this') {
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

        } else if (text.match(/^[A-Z][A-Z_0-9]+$/)) {
            this.isConstant = true

        } else if (text === 'function') {
            this.isFunctionKeyword = true

        } else if (text === 'const') {
            this.isConstKeyword = true
        } else if (domElement.hasChildNodes() && text.match(/@\w/)) {
            this.isAnnotation = true
        }

        this.namespacePrefixSymbol = null
        this.isInlinePrefixed = false
    }

    // For now all symbols we are interested in reside inside of span, but some code may be just text
    static getAllFromLine(line, isAfterClassDeclaration) {
        let lineElements = [...line.domElement.querySelectorAll('td > span > span')]

        // reverse
        return lineElements.reverse().reduce((symbols, domElement) => {
            let isImport = false
            let importTarget = null

            let nextSymbol = symbols[symbols.length - 1]

            let text = domElement.textContent

            if (!isAfterClassDeclaration && text === 'use') {
                let lastElementIndex = symbols.length - 1

                if (lastElementIndex > -1) {
                    if (nextSymbol.text.match(/^\w+(\\\w+)*(\\\{)?$/)) {
                        importTarget = nextSymbol
                        isImport = true
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

            if (symbol.isAccessor && nextSymbol && symbol.domElement.nextSibling.nodeType !== 3) {
                nextSymbol.isFunction = false
            }

            if (nextSymbol && (nextSymbol.isStaticAccessor || nextSymbol.isAccessor)) {
                symbol.targetSymbol = nextSymbol
            }

            if (symbol.isFunctionKeyword && nextSymbol) {
                nextSymbol.isFunction = false
                symbol.targetSymbol = nextSymbol
            }

            if (symbol.isConstKeyword && nextSymbol) {
                nextSymbol.isConstant = false
            }

            if (!isAfterClassDeclaration && symbol.text === 'extends') {
                nextSymbol.isParentClass = true
            }

            if (nextSymbol && nextSymbol.isFunctionKeyword) {
                symbol.isSelf = false
            }

            if (symbol.isAnnotation) {
                let annotationElement = symbol.domElement.querySelector('span.pl-k')

                if (annotationElement) {

                    let textNode = annotationElement.nextSibling

                    if (textNode) {
                        let parts = textNode.textContent.trim().split(/[ |]+/)
                        let annotationBodySymbols = parts.reduce((annotationBody, part) => {

                            // don't add symbols for non-classes
                            if (!part.match(/^\\?[A-Z]\w+/) && !CodeSymbol.selfReferences.includes(part)) {
                                return annotationBody
                            }

                            let span = document.createElement('span')
                            span.innerHTML = part

                            let textNodeParts = textNode.textContent.split(part)
                            let newTextNodeFirst = document.createTextNode(textNodeParts[0])
                            let newTextNodeLast = document.createTextNode(textNodeParts.slice(1).join())

                            textNode.parentNode.insertBefore(newTextNodeFirst, textNode)
                            textNode.parentNode.insertBefore(span, textNode)
                            textNode.parentNode.insertBefore(newTextNodeLast, textNode)

                            textNode.parentNode.removeChild(textNode)
                            textNode = newTextNodeLast

                            annotationBody.push(new CodeSymbol(
                                part.replace(/\[\]$/, ''), // exclude the array hint for the class name
                                span,
                                line,
                                false,
                                false
                            ))

                            return annotationBody
                        }, []).reverse()
                        symbols.push(...annotationBodySymbols)
                    }

                    let annotationSymbol = new CodeSymbol(
                        annotationElement.textContent,
                        annotationElement,
                        line,
                        false,
                        false
                    )
                    symbols.push(annotationSymbol)
                }
            } else {
                symbols.push(symbol)
            }


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