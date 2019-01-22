const isCI = require('is-ci')

if (isCI) {
    require('./cjs/register-throw')
} else {
    require('./cjs/register-warn')
}
