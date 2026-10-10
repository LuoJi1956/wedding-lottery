import { describe, expect, it } from "vitest";
import { formatDateTime, maskPhone, toCsv } from "@/lib/utils";
import { formatTicketNo } from "@/lib/format";

describe("抽奖券编号", () => {
  it.each([
    [1, "NO.0001"],
    [9, "NO.0009"],
    [100, "NO.0100"],
    [12345, "NO.12345"],
  ])("%i 展示为 %s", (input, expected) => {
    expect(formatTicketNo(input)).toBe(expected);
  });
});

describe("手机号掩码", () => {
  it("列表与导出展示时掩码中间四位", () => {
    expect(maskPhone("13800001111")).toBe("138****1111");
  });

  it("未填写手机号显示占位符", () => {
    expect(maskPhone(null)).toBe("-");
    expect(maskPhone("")).toBe("-");
  });

  it("异常长度原样返回，不会吞掉数据", () => {
    expect(maskPhone("138000011")).toBe("138000011");
  });
});

describe("日期展示", () => {
  it("非法时间显示占位符而不是 Invalid Date", () => {
    expect(formatDateTime("not-a-date")).toBe("-");
    expect(formatDateTime("")).toBe("-");
  });

  it("合法时间输出 YYYY-MM-DD HH:mm", () => {
    expect(formatDateTime("2026-10-01T09:30:00.000Z")).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

describe("CSV 导出", () => {
  /** 用码位判断，避免源码里出现看不见的 BOM 字符 */
  const hasBom = (csv: string) => csv.charCodeAt(0) === 0xfeff;
  const stripBom = (csv: string) => (hasBom(csv) ? csv.slice(1) : csv);

  it("带 BOM，Excel 打开中文不乱码", () => {
    expect(hasBom(toCsv([["姓名"]]))).toBe(true);
  });

  it("每个单元格加引号，行之间用 CRLF", () => {
    const csv = stripBom(
      toCsv([
        ["编号", "姓名"],
        ["NO.0001", "张三"],
      ]),
    );
    const [head, ...lines] = csv.split("\r\n");
    expect(head).toBe('"编号","姓名"');
    expect(lines).toEqual(['"NO.0001","张三"']);
  });

  it("单元格内的引号按 CSV 规范翻倍", () => {
    expect(stripBom(toCsv([['张"三"']]))).toBe('"张""三"""');
  });

  it("逗号与换行被引号包住，不会撑破列", () => {
    const row = stripBom(toCsv([["甲,乙", "丙\n丁"]]));
    expect(row).toBe('"甲,乙","丙\n丁"');
    // 引号内的换行不算行分隔符：整份文件仍只有一行记录
    expect(row.split("\r\n")).toHaveLength(1);
  });

  it("以来宾填写的公式开头时降级为文本，避免 CSV 注入", () => {
    const row = stripBom(toCsv([["=1+1", "+8613800001111", "-abc", "@name", "普通姓名"]]));
    expect(row).toBe('"\'=1+1","\'+8613800001111","\'-abc","\'@name","普通姓名"');
  });
});
