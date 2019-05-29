class Import {
    constructor(fqcn, line, keyword, target) {
        this.fqcn = fqcn // string
        this.fqcnParts = fqcn.split('\\') // []
        this.line = line // CodeLine
        this.keyword = keyword // Keyword
        this.target = target // Keyword
        this.isFromGlobalNamespace = this.fqcnParts.length === 1
    }

    // static fromFqcnAndKeyword(fqcn, )

    getClass() {
        return this.fqcnParts[this.fqcnParts.length - 1]
    }

    setUsages(usages) {
        this.usages = usages
    }

    getUsages() {
        return this.usages
    }
}