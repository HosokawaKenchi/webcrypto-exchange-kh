# webcrypto-exchange-kh

A web application for securely encrypting and decrypting files in the browser.

Public URL: <https://hosokawakenchi.github.io/webcrypto-exchange-kh/>

## Overview

- This app is implemented as a static web page.
- It is a JavaScript-based application.
  - No server-side components such as Node.js are required because it runs entirely as a static site.
  - All processing occurs in the browser's local memory.

- The app can generate an asymmetric key pair (public/private) in the browser and let the user download them.

- Hybrid encryption support:
  - File encryption uses AES-256-GCM (suitable for large files).
  - The AES key is encrypted with RSA-OAEP (2048-bit).
  - This enables secure encryption of arbitrary files without size limitations.

- Users can select a local file and encrypt it in the browser using a recipient's public key, then download the encrypted file (with the `.encrypted` extension).

- Users can select a `.encrypted` file and decrypt it in the browser using the corresponding private key, then download the decrypted file.

- Backward compatibility: files encrypted with the older format (direct RSA-OAEP encryption) are also supported.

- The repository's `index.html` is published as a sample via GitHub Pages.

## Encryption schemes

### v2.0 (current): Hybrid encryption
- File encryption: AES-256-GCM (256-bit key, 12-byte random IV)
- Key encryption: RSA-OAEP (2048-bit)
- Hash: SHA-256
- Supported file size: unlimited

### v1.0 (legacy): Direct RSA-OAEP encryption
- Supported only for decryption (backward compatibility)
- Supported file size: up to about 245 bytes

## How to use

### Basic flow
1. The recipient generates a key pair on this page.
2. The recipient shares only the public key with the sender.
3. The sender encrypts the file using the recipient's public key.
4. The recipient decrypts the encrypted file using the private key.

### PWA (Progressive Web App) features
This app supports PWA features including:

- Offline access: once loaded, the app can be used without an Internet connection.
- Add to home screen: installable on smartphones and tablets like an app.
- App-like behavior: full-screen display without the browser address bar.

#### Installation instructions
1. Smartphone (iOS):
   - Open the app in Safari.
   - Tap the share button (the box with an arrow).
   - Choose "Add to Home Screen." 

2. Smartphone (Android):
   - Open the app in Chrome or another browser.
   - Tap the menu button (⋮).
   - Choose "Install app" or "Add to Home screen." 

3. Desktop (Windows/Mac):
   - Open the app in Chrome.
   - Click the "Install" button in the address bar.
