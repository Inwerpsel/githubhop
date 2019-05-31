class CodeLine {
    constructor(number, domElement) {
        this.number = parseInt(number)
        this.domElement = domElement
    }

    static getAllFromDocument(document) {
        let isAfterClassDeclaration = false

        return [...document.querySelectorAll('td[id^=LC]')].map(
            domElement => {
                let codeLine = new CodeLine(domElement.id.replace(/^LC/, ''), domElement)

                codeLine.symbols = CodeSymbol.getAllFromLine(codeLine, isAfterClassDeclaration)

                isAfterClassDeclaration = isAfterClassDeclaration || codeLine.hasClassSymbol()

                return codeLine
            })
    }

    hasClassSymbol() {
        return typeof this.symbols.find(symbol => symbol.isClassSymbol) !== 'undefined'
    }
}