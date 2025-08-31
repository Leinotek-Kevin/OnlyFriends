import React, { useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export default function DateRangeSelector({ onChange }) {
  const [dates, setDates] = useState([]);

  const fixedStart = dayjs("2025-09-01");
  const fixedEnd = dayjs("2025-11-30");

  const handleChange = (values) => {
    setDates(values);
    if (onChange) {
      onChange({
        startDate: values?.[0] ? values[0].format("YYYY/MM/DD") : null,
        endDate: values?.[1] ? values[1].format("YYYY/MM/DD") : null,
      });
    }
  };

  return (
    //暫時鎖定活動區間日期
    <div style={{ padding: "1rem" }}>
      <RangePicker
        value={[fixedStart, fixedEnd]}
        format="YYYY-MM-DD"
        disabled // 整個元件鎖死，不能改動
        style={{ width: 300, height: 35 }}
        placeholder={["開始日期", "結束日期"]}
      />
    </div>
  );

  // return (
  //   <div style={{ padding: "1rem" }}>
  //     <RangePicker
  //       value={dates}
  //       onChange={handleChange}
  //       format="YYYY-MM-DD"
  //       allowClear
  //       style={{ width: 300, height: 35 }}
  //       disabledDate={(current) => current && current > dayjs().endOf("day")}
  //       placeholder={["開始日期", "結束日期"]}
  //     />
  //   </div>
  // );
}
