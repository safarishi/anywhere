import { FileType } from "../consts"
import style from "../style"

interface Renderer {
  render: any
  renderDirectory: any
  renderToHtml: any
}

let renderer: Renderer = {
  render: (data: any = {}) => {
    let { type, fileMapList, pathList, content } = data

    if (type === FileType.DIRECTORY) {
      let html = renderer.renderDirectory({ fileMapList, pathList })

      return html
    }

    if (type === FileType.NOT_FOUND) {
      return 'Page 404'
    }

    return content
  },

  renderDirectory: (
    { pathList = [], fileMapList = [] }: { pathList: any[], fileMapList: any[] },
  ) => {
    if (!pathList.length && !fileMapList.length) {
      return renderer.renderToHtml()
    }

    let title = ''
    let nav = ''
    let content = ''

    if (pathList.length) {
      title = pathList[pathList.length - 1].relativePath

      nav = `
        <h1>
          ${pathList
            .map(({ name, href }: { name: string, href: string }) => {
              return ` <a href="${href}">${name}</a> /`
            })
            .join('')}
        </h1>
      `
    }

    if (fileMapList.length) {
      content = `
        <ul id="files">
          ${fileMapList
            .map(({ name, href, clzName }: { name: string, href: string, clzName: string }) => {
              return `
                <li>
                  <a class="${clzName}" href="${href}">
                    <span class="name">${name}</span>
                  </a>
                </li>
              `
            })
            .join('')}
        </ul>
      `
    }

    return renderer.renderToHtml({
      title,
      nav,
      content,
    })
  },

  renderToHtml: ({ title = '', nav = '', content = '' }: any = {}) => {
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
          />
          <link rel="icon" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEYAAAA5CAYAAAH8XW0GAAAAAXNSR0IArs4c6QAAA8pJREFUaAXtm0trFEEQx6snG6OJEpCAQiCeBfFi/ACJmmySJeAhH0DQk+Ri9OBFUBCMRIRcFL2IFy8+QDfZGJL4CULMwYNKQPCBgh4UEvPabf+92rvZ2anMzD5mF1MDS09Xd1fV/Lp6enp6lghHf0ovmp859zrUwJQe0ZrGvAqNTBGtOFyhlWuiZt9KpnLEleA8UWJWt5vU62hz6IcaeKmHdYbOosLXyT7V61VRASKukj/QUPlWMs0jRhDInC+n5An1WQ3O6KObG+QZS+byeTiFJbH0Jp0qFOVzfpzzNQOi3NqAOw8EiWu8VV6HitrbaHyri6Wco2sz2e7F3WIe4yBmlTQ10tCzk+qdzfulMdO97oG0tkFv0TBw/AQaZtt5AkvxsnsKd4OpspUYL0VJcV8JkyoxyQ4y3MgPYDznRnGxLV6SnQlM8UBK/8IY2MdXzZfA6thEn7qUl1TuTCVS+kKG6FYolYpWJ+NqT6g2ASrHtMJ9bNsHBQ8tmnaHmfY8NBSJMBtfq8ggKtJcggA3/Ct144zxX5zhelHICBmOACevs5hRtMJ5GrXcmehVd4BnJGrDbnstrdScnfqH3+umpSV6jDmqw10pl1c0g8mxqk6r/ll9iNbpQ86oz0mYBaaPqqJiJ4wjpjWWQakiLRUShB5NmF3jeBgbrJD9AjVlL7UKtJWQwXPMq4m46jZNQ5Mpwd62TUC6yz6o1dwZ6yli8UbdOANCx+vGGUNInLFx4k6FjJuIzQsZS8KdChk3EZsXMpaEOxUybiI2L2QsCXcqZNxEbL6eyCw7eNf50XpWy1Q5dNXBkrUDa9z1WjoCIE+w5p/PrrWNI0NaN/yeo4NROuWkST/vUV+szZwzg9O6M52hh3hKP2wLy0mh2GwL3kz2qcvl6KlV2ywYLOhm4UB3NZyAgTRWsMeSceW5a14Nm5XQ6SSm9JlqQTEOYoekIaPpdWJan66Ew1HpiMHx/VEYy6TpKSLT7IonEUV3GzW9aWylb1HY5my0rJF+0KVWvcpL2kv0UhRYpikBPAlzu1//GbhVVSouQ2u2s/5px5C/j88uzt/rVBv1NGFX5eLDKMXEc+7Td1rBF1dHoo+YMJ7Wou7f72quS8R4wEfk7BUwHmCMSMAIGIYAI5aIETAMAUYsESNgGAKMWCJGwDAEGLFEjIBhCDBiiRgBwxBgxBIxAoYhwIglYgQMQ4ARO46iBaZsx4rxUnzBedGr5mIO9exYCq4Lx9bObXzeehFp/jD/s8VfZEexS9aNLY5d+ZL/+wwRsoj3vKP41PuRvdI/VZ3jJIt8wn4AAAAASUVORK5CYII=" type="image/x-icon" />
          <title>${title}</title>
          ${style}
        </head>
        <body class="directory">
          ${nav}
          ${content}
        </body>
      </html>
    `
  },
}

export default renderer
