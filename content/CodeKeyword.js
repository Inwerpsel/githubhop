class CodeKeyword {
    constructor (text, domElement, isImportKeyword, target) {
        this.text = text
        this.domElement = domElement
        this.isImportKeyword = isImportKeyword
        this.target = target
    }

    // For now all keywords we are interested in reside inside of span, but some code may be just text
    static getAllFromParentElement(domElement) {
        return [...domElement.querySelectorAll('span > span')].reverse().reduce((result, domElement) => {
            let isImportKeyword = false
            let fqcnKeyword = null
            if (domElement.innerHTML === 'use') {
                let lastElementIndex = result.length - 1

                if (lastElementIndex > -1) {
                    let possibleFqcnKeyword = result[lastElementIndex]

                    if (possibleFqcnKeyword.text.match(/^\w+(\\\w+)*$/)) {
                        fqcnKeyword = possibleFqcnKeyword
                        isImportKeyword = true
                    }
                }


            }
            result.push(new CodeKeyword(
                domElement.innerHTML,
                domElement,
                isImportKeyword,
                fqcnKeyword
            ))

            return result
        }, [])
    }
}