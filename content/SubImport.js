class SubImport {
    constructor(anImport, subNamespace, symbol, isNamespace) {
        this.import = anImport
        this.subNamespace = subNamespace
        this.symbol = symbol
        this.isNamespace = isNamespace
    }

    // static getAllFromLines(imports, lines) {
    //     let importedNamespaces = imports.map(anImport => anImport.getClass())
    //
    //     return lines.reduce((result, line) => {
    //         result.push(...SubImport.getAllFromLine(imports, line))
    //     }, [])
    // }

    // static getAllFromLine(imports, line) {
    //     // return line.symbols.filter(symbol => symbol.isInlineImport).map(symbol => return new SubImport())
    // }
}