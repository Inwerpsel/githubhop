class SourceFile {
    constructor(username,
                repository,
                branch,
                filename,
                lines,
                imports
    ) {
        this.username = username
        this.repository = repository
        this.branch = branch
        this.filename = filename
        this.lines = lines
        this.imports = imports
    }

    static fromUrlAndDocument(
        url,
        document
    ) {
        let matches = url.match(/^https:\/\/github\.com\/([\w-_]+)\/([\w-_]+)\/blob\/([\w-_\.]+)\/(.+\.(\w+))/)

        if (matches === null) {
            throw "location not github file"
        }

        let username = matches[1]
        let repository = matches[2]
        let branch = matches[3]
        let filename = matches[4]
        let extension = matches[5]

        if (!SourceFile.supportsExtension(extension)) {
            console.log(`Detected a source file on github but extension "${extension}" is not supported.`)
            throw "extension not supported"
        }

        let lines = CodeLine.getAllFromDocument(document)

        let imports = Import.getAllFromLines(lines)

        return new SourceFile(
            username,
            repository,
            branch,
            filename,
            lines,
            imports
        )
    }

    static supportsExtension(extension) {
        return [
            'php'
        ].includes(extension)
    }

    getLinesAfterLastImport() {
        let lastImport = this.imports[sourceFile.imports.length - 1]

        return this.lines.filter(
            line => line.number > lastImport.line.number
        )
    }

    fetchImportUsages() {
        if (this.imports.length === 0) {
            return
        }

        let longestImportRight = this.imports.reduce(
            (biggestRight, anImport) => Math.max(anImport.targetSymbol.domElement.getBoundingClientRect().right, biggestRight),
            0
        )

        let lastImportLineNumber = this.imports[sourceFile.imports.length - 1].line.number

        this.imports.forEach((anImport) => {
            // Search code for occurrences
            anImport.fetchUsagesAndSubImports(sourceFile, lastImportLineNumber)
            anImport.generateUsagesPopup(longestImportRight)
        })
    }
}