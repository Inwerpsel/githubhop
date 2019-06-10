class CodeLine {
    constructor(number, domElement) {
        this.number = parseInt(number)
        this.domElement = domElement
        this.classSymbol = null
    }

    static getAllFromDocument(document) {
        let isAfterClassDeclaration = false

        return [...document.querySelectorAll('td[id^=LC]')].map(
            domElement => {
                let codeLine = new CodeLine(domElement.id.replace(/^LC/, ''), domElement)

                codeLine.symbols = CodeSymbol.getAllFromLine(codeLine, isAfterClassDeclaration)



                isAfterClassDeclaration = isAfterClassDeclaration || codeLine.getClassSymbol()

                return codeLine
            })
    }

    getClassSymbol() {
        if (this.classSymbol === null) {
            this.classSymbol = this.symbols.find(symbol => symbol.isClassSymbol)
        }

        return this.classSymbol
    }
}