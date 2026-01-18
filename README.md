# Deploying to Tizen TV

This guide explains how to deploy this React IPTV application to a Samsung Tizen TV.

## Options for Deployment

### Option A: Building from Source (Recommended for Developers)
If you want to modify the code, follow the **full guide** below.

### Option B: Using a Pre-Built Release (Easier)
If you just want to install the app without installing Node.js:
1.  Download the `build-dist.zip` from the GitHub **Releases** page.
2.  Extract the ZIP folder.
3.  Follow **Step 1 (Enable Developer Mode)** and **Step 3 (Setup Certificates)** below.
4.  In **Step 4**, instead of copying from `dist/`, copy the files from your extracted folder.

---

## Prerequisites

1.  **Samsung TV (2017 or newer)**
    *   Must be connected to the same network as your PC.
    *   **Developer Mode** must be enabled.
2.  **Tizen Studio**
    *   Download and install [Tizen Studio](https://developer.tizen.org/development/tizen-studio/download).
    *   During installation, select the **TV Setup** profile.
    *   Launch **Package Manager** and install:
        *   `Tizen SDK tools`
        *   `TV Extensions-*.0` (match your TV version, e.g., 6.0, 7.0)
3.  **Node.js** (v18 or higher) - *Only required for Option A*.

---

## Step 1: Enable Developer Mode on TV

1.  Go to **Apps** on your Samsung TV.
2.  Press `1`, `2`, `3`, `4`, `5` on your remote.
3.  A "Developer Mode" popup will appear.
4.  Switch **Developer Mode** to **On**.
5.  Enter your PC's IP Address in the **Host PC IP** field.
6.  Restart the TV (hold Power button until it reboots).

---

## Step 2: Build the Application (Option A only)

Open your terminal in the project folder and run:

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

The `dist/` folder now contains the ready-to-deploy application.

---

## Step 3: Setup Tizen Studio Certificates (Required)

*Note: You only need to do this once. Certificates bind the app to your specific TV.*

1.  Open **Tizen Studio**.
2.  Go to **Tools** > **Certificate Manager**.
3.  Click **+** to create a new profile (e.g., `SamsungCert`).
4.  Select **Samsung** (not Tizen) to deploy to actual TVs.
5.  Device Type: **TV**.
6.  Create a new **Author Certificate** (enter name and password).
7.  Create a new **Distributor Certificate**.
    *   **CRITICAL**: You MUST add your TV's **DUID** here.
    *   If your TV is connected (Device Manager), the DUID should appear automatically.

---

## Step 4: Import and Deploy

The easiest way to deploy is to create a dummy project in Tizen Studio and replace its content with your build.

1.  **Create Project**:
    *   File > New > Tizen Project.
    *   Select **Template** > **Next**.
    *   Select **TV** > **Extension SDK** (matching your TV version) > **Next**.
    *   Select **Web Application** > **Basic Project** > **Next**.
    *   Name it `ReactIPTV` > **Finish**.

2.  **Replace Content**:
    *   Open the `ReactIPTV` folder (in your Tizen Studio workspace).
    *   **Delete** all files inside it (`index.html`, `css/`, `js/`, etc.).
    *   **Copy** contents from your `dist/` folder (or downloaded ZIP) into this `ReactIPTV` folder.
    *   *Ensure `config.xml` is replaced.*

3.  **Deploy**:
    *   In Tizen Studio, **Right-click** on the `ReactIPTV` project.
    *   Select **Run As** > **Tizen Web Application**.
    *   The app should launch on your TV!

---

## Troubleshooting

*   **"Permit to install failed"**: Your Certificate does not contain your TV's DUID. Re-do **Step 3** and ensure the DUID is added.
*   **"Signature invalid"**: You are trying to install a package signed by someone else. You must follow **Step 4** to sign it with your own certificate.
*   **Keys not working**: Ensure `config.xml` has the `<tizen:privilege name="http://tizen.org/privilege/tv.inputdevice"/>`.