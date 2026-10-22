# PDF 签名测试 fixture

`signed.pdf` 与 `tampered.pdf` 为 Codex 为自动化测试机械复制的公开自签名测试文件，仅包含测试证书与公开测试数据，不含私钥、真实用户证书或敏感信息。

- `signed.pdf`：原始签名文件，用于验证签名覆盖全文时 `currentDocumentVerified=true`。
- `tampered.pdf`：在签名字节范围内篡改后的文件，用于验证不得报告摘要一致。
- `files.test.js` 会在 `signed.pdf` 后追加固定文本，验证尾部未覆盖内容的整体状态为失败。
