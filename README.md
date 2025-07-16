# MCP Lead Example


1. **custom-mcp-server**: MCP sunucusu
2. **simple-lead-api**: Lead oluşturma için basit bir REST API
3. **n8n workflow**: Agent tabanlı bir n8n süreci

---

## 1. custom-mcp-server

### Başlatmak için:

```bash
cd custom-mcp-server
npm install
npm run dev
```

### Önemli Endpointler

| Endpoint         | Açıklama                                |
|------------------|-----------------------------------------|
| `GET /sse`       | n8n agent bağlantısı için kullanılır     |
| `POST /messages` | Agent mesajlarını iletir                 |
| `ALL /mcp`       | (Opsiyonel) streamable HTTP destekler    |

---

## 2. simple-lead-api

### Başlatmak için:

```bash
cd simple-lead-api
npm install
npm start
```

### API Kullanımı

POST `/api/lead`:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+905555555555"
}
```

---

## 3. n8n workflow

- `n8n-custom-mcp.json` dosyasını `Import Workflow` diyerek içe aktarın.
- MCP Client tool yapılandırmasında:
  - **MCP Server URL**: `http://localhost:3001/sse`
  - **Tool**: `create-lead`

---

Her şey ayağa kalktıktan sonra, n8n içinden agent'e doğal dilde isim, mail ve telefon içeren mesaj yollayarak lead oluşturabilirsin.
