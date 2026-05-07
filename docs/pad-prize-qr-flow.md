# PAD Prize QR Flow

## Conclusion

PAD frontend can display a QR code after receiving the prize upload response from backend, but the QR code content should be a standard, accessible URL instead of only a raw `claimToken` or `prizeRecordId`.

Recommended QR content:

```text
https://h5.bello.network/pad-prize/claim?claimToken=xxx&prizeRecordId=123
```

Using a URL makes the QR code recognizable by normal phone camera apps. It also gives Bello H5 and Bello APP one shared entry point for claim handling.

## Backend Response

Current prize upload response:

```json
{
  "code": 0,
  "msg": "",
  "data": {
    "prizeRecordId": 0,
    "claimToken": "",
    "expireTime": ""
  }
}
```

PAD frontend should use `claimToken` and `prizeRecordId` to generate the QR URL. `expireTime` should be displayed as the QR or prize claim expiration time.

## Scan Behavior

### Phone System Camera

If the QR code content is a URL, the phone system camera can recognize it and open the H5 page.

Expected path:

1. User scans QR code with phone camera.
2. Browser opens the H5 claim page.
3. H5 handles registration, download, or claim flow based on user state.

### Bello APP Scanner

The APP can scan the same QR code and identify the URL or token.

Expected path:

1. User scans QR code inside Bello APP.
2. APP parses `claimToken` and `prizeRecordId`.
3. APP checks whether the prize can be claimed.
4. If claimable, APP issues the prize and navigates to the claim result page.
5. If not claimable, APP marks the prize record as invalid or expired and still navigates to the claim result page.

## H5 Flow

The H5 claim page should be the unified web entry.

Recommended behavior:

1. User opens the H5 claim URL from QR code.
2. H5 checks whether the phone number or account is registered.
3. If the user is not registered, H5 shows the registration page.
4. After successful registration, backend issues the prize and H5 redirects to the download page to guide APP installation.
5. If the phone number is already registered, H5 redirects to the download page or attempts to open APP.
6. If conditions are met, the prize is issued to the user.

## Implementation Requirement

PAD only needs to:

1. Submit game result to backend.
2. Receive `prizeRecordId`, `claimToken`, and `expireTime`.
3. Generate a QR code with the official H5 claim URL.
4. Display the QR code and expiration time.

Backend, H5, and APP should own:

1. Claim eligibility validation.
2. Registration state checking.
3. Prize issuing.
4. Expiration handling.
5. Claim result page routing.

## Pending Alignment

The final H5 claim URL domain and path still need to be confirmed.

Once confirmed, PAD frontend should replace the current temporary `registerH5Url` QR generation with the official claim URL, for example:

```text
https://h5.bello.network/pad-prize/claim
```
