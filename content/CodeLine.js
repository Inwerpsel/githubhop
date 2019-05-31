class CodeLine {
    constructor(number, domElement, keywords) {
        this.number = parseInt(number)
        this.domElement = domElement
        this.keywords = keywords
    }

    static getAllFromDocument(document) {
        return [...document.querySelectorAll('td[id^=LC]')].map( domElement => new CodeLine(
            domElement.id.replace(/^LC/, ''),
            domElement,
            CodeKeyword.getAllFromParentElement(domElement)
        ))
    }
}