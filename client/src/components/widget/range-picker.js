import React, { useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export default function DateRangeSelector({ onChange }) {
  const [dates, setDates] = useState([]);

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
    <div style={{ padding: "1rem" }}>
      <RangePicker
        value={dates}
        onChange={handleChange}
        format="YYYY-MM-DD"
        allowClear
        style={{ width: 300, height: 35 }}
        disabledDate={(current) => current && current > dayjs().endOf("day")}
        placeholder={["開始日期", "結束日期"]}
      />
    </div>
  );
}
