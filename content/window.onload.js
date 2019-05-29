let sourceFile

window.onload = function () {
    try {
        sourceFile = SourceFile.fromUrlAndDocument(window.location.href, document)
    } catch (error) {
        if (error === 'location not github file') {
            console.log(error)

            return
        } else if (error === 'extension not supported') {
            console.log(`extension not supported for ${window.location.href}`)

            return
        } else {
            throw error
        }
    }

    if (sourceFile.imports.length > 0) {
        chrome.runtime.sendMessage({
            "message": "imports_found",
            "username": sourceFile.username,
            "repository": sourceFile.repository,
            "branch": sourceFile.branch
        })
    }

    sourceFile.imports.forEach( (anImport) => {
        // Search code for occurrences
        let usages = sourceFile.lines.reduce( (result, line) => {
            if (line === anImport.line) {
                return result
            }

            let matchingKeywords = line.keywords.filter(
                keyword => keyword.text === anImport.getClass()
            )

            let lineUsages = matchingKeywords.map(keyword => {
                return new ImportUsage(
                    line,
                    keyword
                )
            })

            if (lineUsages.length > 0) {
                result.push(...lineUsages)
            }

            return result
        }, [])

        anImport.setUsages(usages)
    })
}