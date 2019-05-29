class CodeLine {
    constructor(number, domElement, keywords) {
        this.number = number
        this.domElement = domElement
        this.keywords = keywords
        this.importKeyword = keywords.filter( keyword => keyword.isImportKeyword)
    }

    static getAllFromDocument(document) {
        return [...document.querySelectorAll('td[id^=LC]')].map( domElement => new CodeLine(
            domElement.id.replace(/^LC/, ''),
            domElement,
            CodeKeyword.getAllFromParentElement(domElement)
        ))
    }
}