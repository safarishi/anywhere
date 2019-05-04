#!/usr/bin/env node

require('@babel/register')({
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ],
  ignore: [],
  cache: false
})

require('./entry')
