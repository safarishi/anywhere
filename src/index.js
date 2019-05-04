#!/usr/bin/env node

require('@babel/register')({
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ],
  only: [
    /\/src\/entry\.js$/
  ]
})

require('./entry')
