
Chrome extension that enables you to navigate to the source file of import statements.

For now only PHP (psr-0 and psr-4) is supported.

In order to do the lookup the extension depends on the composer.json and the composer.lock file.

In order to navigate to the source file of dependencies it is required that the file containing the import is in a repository that has a composer.lock file. The reason for that is that the lock file contains the mapping of namespace to directory. 

TODO:
- try resolve external dependencies when there is no lock file
- support languages
- detect usages in phpdoc
- support grouped imports
- support use function
- support global functions
- navigatge to function definition in current class
- configurable mouse buttons for navigation
- maybe use https://github.com/niklasvh/php.js instead of parsing html
- cache invalidation
