# 🧩 Navata Code Generator CLI Tools

`navata-generator` is a comprehensive **Command Line Interface (CLI)** toolset designed to automate repetitive tasks in development.

This toolset includes two main commands:

- **`navata-redirect`** → Generate Redirect configuration files from Google Sheets
- **`navata-api`** → Quickly scaffold API endpoints and Hooks

---

## 🚀 1. Installation

Since this is a CLI utility, you should install it **globally** so you can call it directly from anywhere in your terminal.

```bash
npm install -g navata-generator
```

Once installed, you can start using the sub-commands:

```bash
navata-redirect
navata-api
```

---

## 🌐 2. Using `navata-redirect`

This command reads Redirect configuration data from **Google Sheets** and exports it to a standardized JSON file for use in your application (typically in `next.config.js`).

### 🧠 Command Syntax

```bash
navata-redirect --spreadsheet-id=<GOOGLE_SHEET_ID> --sheet-id=<SHEET_TAB_ID> --output-file=<OUTPUT_FILENAME>
```

### 💡 Practical Example

The following command will connect to the specified Google Sheet, read data from the corresponding sheet tab, and save the result to `redirects.json` in the current directory:

```bash
navata-redirect \
  --spreadsheet-id=17yPqr-q3d28FhfTk2M-rFYS1Uc6Ta35PndtdB2-rIqc \
  --sheet-id=132624243 \
  --output-file=redirects.json
```

### 📋 Parameters

| Parameter          | Description                                                              | Required |
| ------------------ | ------------------------------------------------------------------------ | -------- |
| `--spreadsheet-id` | The unique ID of the Google Sheet containing the Redirect configuration. | ✅ Yes   |
| `--sheet-id`       | The ID of the specific Sheet tab to read data from (GID).                | ✅ Yes   |
| `--output-file`    | The name and path of the JSON file to be exported.                       | ✅ Yes   |

---

## 🛠️ 3. Using `navata-api`

This is an **interactive CLI tool** that automatically creates file structures for API endpoints (Route Handlers) and related React Hooks.

### 🧠 Command Syntax

Simply run the command without any parameters:

```bash
navata-api
```

---

### 🪄 Interactive Step-by-Step Guide (All steps grouped)

1. **Step 1 — Select file type to create**  
   Decide whether you want to create an **API (Route Handler)**, a **Hook (Custom React Hook)**, or **both**.

   ```
   ? Select the option? (Use arrow keys)
   ❯ Create API
     Create Hook
     Create API & Hook
   ```

2. **Step 2 — Select Domain/Module**  
   Determine the parent module directory for your API. This helps organize code according to Micro-frontend or Module architecture.

   ```
   What's your domain?
   ❯ pmc-ecm-order/api
     pmc-ecm-product/api
   ```

3. **Step 3 — Enter Endpoint Name**  
   Enter the file name that will become your endpoint.

   ```
   What's your file the endpoint? create
   ```

   - Example generated endpoint (if domain `pmc-ecm-order/api` and endpoint `create`):

   ```
   /src/api/order/create.ts
   ```

4. **Step 4 — Select HTTP Method (If creating API)**  
   If you selected **Create API** or **Create API & Hook**, choose the HTTP method. This will be the exported function name inside the API file.

   ```
   Select a method (Use arrow keys)
   ❯ GET
     POST
     PUT
     PATCH
     DELETE
   ```

   - Example generated API file content for `POST`:

   ```bash
    import { OrderCreateResponseData, OrderCreateParam } from '@/types/order/create';
    import { orderApi } from '@/consts/api-paths';
    import { RequestTypeDynamic } from '@/utils/apiService/types';
    import { sendRequest } from '@/utils/apiService';

    const url = `${orderApi}/create`;

    export const orderCreate = async (args: RequestTypeDynamic<OrderCreateParam>) => {
    return await sendRequest<any, OrderCreateResponseData>({
        config: {
        url,
        method: 'GET',
        },
        payload: args.payload,
    });
    };

   ```

5. **Step 5 (Optional) — Hook File Name**  
   If you chose **Create Hook** or **Create API & Hook**, the tool will ask for the hook file name.

   ```
   What's your file name? (create)
   ```

---

## 🛠️ 4. Using `navata-optimize-svg`

This command reads Redirect configuration data from Google Sheets and exports it to a standardized JSON file for use in your application (typically in next.config.js).

### 🧠 Command Syntax

```bash
navata-optimize-svg --input <PATH_TO_INPUT_FOLDER> --output <PATH_TO_OUTPUT_FOLDER> --prefix <PREFIX_NAME>
```

### 💡 Practical Example

If you have a folder of raw color illustrations and want to optimize them into a new folder with a "color" prefix:

```bash
navata-optimize-svg \
  --input /Users/thai.nv/Downloads/Illustration/Color \
  --output /Users/thai.nv/Downloads/Illustration/Color-optimize \
  --prefix color
```

### 📋 Parameters

| Parameter  | Description                                                           | Required |
| ---------- | --------------------------------------------------------------------- | -------- |
| `--input`  | The path to the source folder containing raw SVG files..              | ✅ Yes   |
| `--output` | The destination path where optimized SVGs will be saved.              | ✅ Yes   |
| `--prefix` | A custom string to be prepended to each filename (e.g., mono, color). |

---

## 🧱 Example Folder Structure

```
src/
 ├─ utils/
 │   └─ api/
 │       └─ create/
 │           └─ route.ts
 ├─ types/
 │   └─ order/
 │       └─ create.ts
 └─ hooks/
     └─ useOrderCreate.ts
```

---

## 🧩 Summary

| Command           | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `navata-redirect` | Generate redirects JSON file from Google Sheets      |
| `navata-api`      | Interactive CLI to generate API route and Hook files |

---
