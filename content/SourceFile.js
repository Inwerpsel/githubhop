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

        if (!SourceFile.extensionIsSupported(extension)) {
            console.log(`Detected a source file on github but extension "${extension}" is not supported.`)
            throw "extension not supported"
        }

        let lines = CodeLine.getAllFromDocument(document)

        let imports = lines.reduce( (result, line) => {
            let lineImports = line.keywords
                .filter(keyword => keyword.isImportKeyword)
                .map(keyword => new Import(keyword.target.text, line, keyword, keyword.target))

            console.log(lineImports)

            if (lineImports.length > 0) {
                result.push(...lineImports)
            }

            return result;
        }, [])

        return new SourceFile(
            username,
            repository,
            branch,
            filename,
            lines,
            imports
        )
    }

    static extensionIsSupported(extension) {
        return [
            'php'
        ].indexOf(extension) !== -1
    }
}