// 读取 pathname 对应的文件类型
export enum FileType {
  FILE = 'file',
  NOT_FOUND = '404',
  DIRECTORY = 'directory',
  // 读取文件发生错误
  ERROR = 'error',
}
