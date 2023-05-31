import { describe, expect, test } from 'vitest'
import type { SourceCodeTransformer, UnoGenerator } from '@unocss/core'
import { createGenerator } from '@unocss/core'
import MagicString from 'magic-string'
import transformerCompileClass from '@unocss/transformer-compile-class'
import presetUno from '@unocss/preset-uno'

describe('transformer-compile-class', () => {
  const uno = createGenerator({
    presets: [
      presetUno(),
    ],
  })

  const defaultTransformer = transformerCompileClass()
  const customClassNameTransformer = transformerCompileClass({
    trigger: /(["'`]):uno(?:-)?(?<name>[^\s\1]+)?:\s([^\1]*?)\1/g,
  })

  async function transform(code: string, _uno: UnoGenerator = uno, _tranformer: SourceCodeTransformer = defaultTransformer) {
    const s = new MagicString(code)
    await _tranformer.transform(s, 'foo.js', { uno: _uno, tokens: new Set() } as any)
    const result = s.toString()
    const { css } = await uno.generate(result, { preflights: false })
    return {
      code: result,
      css,
    }
  }

  test('basic', async () => {
    const result = await transform(`
<div class=":uno: bg-red-500 text-xl font-bold border border-gray-200 dark:hover:bg-green-500 transform scale-5">
<div class=":uno: foo bar">

<div class=":uno: text-center sm:text-left foo">
  <div class=":uno: text-sm font-bold hover:text-red"/>
</div>
    `.trim())
    expect(result.code.trim()).toMatchInlineSnapshot(`
      "<div class=\\"uno-pe1esh\\">
      <div class=\\"foo bar\\">

      <div class=\\"uno-cbgd7b foo\\">
        <div class=\\"uno-s9yxer\\"/>
      </div>"
    `)
    expect(result.css).toMatchInlineSnapshot(`
      "/* layer: shortcuts */
      .uno-pe1esh{--un-scale-x:0.05;--un-scale-y:0.05;transform:translateX(var(--un-translate-x)) translateY(var(--un-translate-y)) translateZ(var(--un-translate-z)) rotate(var(--un-rotate)) rotateX(var(--un-rotate-x)) rotateY(var(--un-rotate-y)) rotateZ(var(--un-rotate-z)) skewX(var(--un-skew-x)) skewY(var(--un-skew-y)) scaleX(var(--un-scale-x)) scaleY(var(--un-scale-y)) scaleZ(var(--un-scale-z));border-width:1px;--un-border-opacity:1;border-color:rgba(229,231,235,var(--un-border-opacity));--un-bg-opacity:1;background-color:rgba(239,68,68,var(--un-bg-opacity));font-size:1.25rem;line-height:1.75rem;font-weight:700;}
      .dark .uno-pe1esh:hover{--un-bg-opacity:1;background-color:rgba(34,197,94,var(--un-bg-opacity));}
      .uno-cbgd7b{text-align:center;}
      .uno-s9yxer{font-size:0.875rem;line-height:1.25rem;font-weight:700;}
      .uno-s9yxer:hover{--un-text-opacity:1;color:rgba(248,113,113,var(--un-text-opacity));}
      @media (min-width: 640px){
      .uno-cbgd7b{text-align:left;}
      }"
    `)
  })

  test('different sequence of utility classes', async () => {
    const order1 = await transform('<div class=":uno: flex bg-blue-400 my-awesome-class font-bold"></div>')
    const order2 = await transform('<div class=":uno: my-awesome-class bg-blue-400  font-bold flex"></div>')

    expect(order1.css).toBe(order2.css)
    expect(order1.code).toBe(order2.code)
  })

  test('custom class name trigger (without class name)', async () => {
    const result = await transform(`
<div class=":uno: bg-red-500 text-xl">`.trim(), uno, customClassNameTransformer)

    expect(result.code.trim()).toMatchInlineSnapshot(`
      "<div class=\\"uno-trmz0g\\">"
    `)

    expect(result.css).toMatchInlineSnapshot(`
      "/* layer: shortcuts */
      .uno-trmz0g{--un-bg-opacity:1;background-color:rgba(239,68,68,var(--un-bg-opacity));font-size:1.25rem;line-height:1.75rem;}"
    `)
  })

  test('custom class name trigger (with basic class name)', async () => {
    const result = await transform(`
<div class=":uno-foo: bg-red-500 text-xl">`.trim(), uno, customClassNameTransformer)

    expect(result.code.trim()).toMatchInlineSnapshot(`
      "<div class=\\"uno-foo\\">"
    `)

    expect(result.css).toMatchInlineSnapshot(`
      "/* layer: shortcuts */
      .uno-foo{--un-bg-opacity:1;background-color:rgba(239,68,68,var(--un-bg-opacity));font-size:1.25rem;line-height:1.75rem;}"
    `)
  })

  test('custom class name trigger (with complex class name)', async () => {
    const result = await transform(`
<div class=":uno-foo_bar-baz: bg-red-500 text-xl">`.trim(), uno, customClassNameTransformer)

    expect(result.code.trim()).toMatchInlineSnapshot(`
      "<div class=\\"uno-foo_bar-baz\\">"
    `)

    expect(result.css).toMatchInlineSnapshot(`
      "/* layer: shortcuts */
      .uno-foo_bar-baz{--un-bg-opacity:1;background-color:rgba(239,68,68,var(--un-bg-opacity));font-size:1.25rem;line-height:1.75rem;}"
    `)
  })

  test('custom class name conflicts', async () => {
    await expect(async () => {
      await transform(`
      <div class=":uno-foo: w-1"/>
      <div class=":uno-foo: w-2"/>
    `.trim(), uno)
    }).rejects
      .toMatchInlineSnapshot('[Error: duplicate compile class name \'uno-foo\', please choose different class name]')
  })

  test('normal class name should not conflicts', async () => {
    const result = await transform(`
<div class=":uno: w-1 h-1"/>
<div class=":uno: w-2 h-2"/>
<div class=":uno: h-1 w-1"/>
    `, uno)

    expect(result.code.trim()).toMatchInlineSnapshot(`
      "<div class=\\"uno-prhvrm\\"/>
      <div class=\\"uno-umiu5u\\"/>
      <div class=\\"uno-prhvrm\\"/>"
    `)
  })
})
