
Chrome extension that enables you to navigate to the source file of import statements.

For now only PHP (psr-0 and psr-4) is supported.

Do the lookup the extension depends on the composer.json and the composer.lock file.

In order to navigate to the source file of dependencies it is required that the file containing the import is in a repository that has a composer.lock file. The reason for that is that the lock file contains the mapping of namespace to directory. If there is no lock file the extension will still link to imports from within the same repository, but for external imports a google search will be performed instead (`github ${namespace}`) as a fallback.

You can navigate from the imports or from usages of imported classes. If a member on the imported class is used the extension will try to point to the line where that member is declared (does not work in all cases).

For global constants, functions and classes the extension links to the corresponding documentation page on php.net.

This will perform ok on files up to a couple of thousand lines, however, as the parsing is currently very inefficient, really large files may take over a second to process.

TODO:
- migrate to typescript
- support other languages
- detect usages in phpdoc
- support grouped imports
- support use function
- configurable mouse buttons for navigation
- maybe use https://github.com/niklasvh/php.js instead of parsing html
- cache invalidation
- clean up parsing...
- supported class hierarchy
- try resolve external dependencies when there is no lock file
