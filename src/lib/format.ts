/** 来宾顺序号：数据库里存整数，展示与导出统一补零 */
export function formatTicketNo(n: number): string {
  return `NO.${String(n).padStart(4, "0")}`;
}
