import { Modal } from "antd";

export function showModalMessage({
  type,
  content,
  okText = "確認",
  okButtonStyle,
  title,
}) {
  if (type === "success") {
    Modal.success({
      title: title || "申請成功",
      content,
      okText,
      okButtonProps: {
        style: okButtonStyle || {
          backgroundColor: "#0096b1",
          borderColor: "#0096b1",
        },
      },
    });
  } else if (type === "error") {
    Modal.error({
      title: title || "錯誤",
      content,
      okText,
      okButtonProps: {
        style: okButtonStyle || {
          backgroundColor: "#0096b1",
          borderColor: "#0096b1",
        },
      },
    });
  }
}
