import forge from 'node-forge';

export interface ExtractedCert {
    privateKeyPem: string;
    certificatePem: string;
    certNodeForge: forge.pki.Certificate;
}

/**
 * Extract Private Key and Public Certificate from a base64 encoded PFX
 */
export function extractFromPfx(pfxBase64: string, password: string): ExtractedCert {
    try {
        const p12Der = forge.util.decode64(pfxBase64);
        const p12Asn1 = forge.asn1.fromDer(p12Der);
        
        let p12: forge.pkcs12.Pkcs12Pfx;
        try {
            p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);
        } catch (err: any) {
             throw new Error('Senha incorreta ou PFX inválido: ' + err.message);
        }

        let privateKey: forge.pki.PrivateKey | null = null;
        let certificate: forge.pki.Certificate | null = null;

        // Extract SafeBags
        for (const safeContents of p12.safeContents) {
            for (const safeBag of safeContents.safeBags) {
                 if (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag) {
                     privateKey = safeBag.key || null;
                 } else if (safeBag.type === forge.pki.oids.keyBag) {
                     privateKey = safeBag.key || null;
                 } else if (safeBag.type === forge.pki.oids.certBag) {
                     // Get the primary certificate (Usually the client cert comes first with a friendlyName)
                     if (!certificate) {
                         certificate = safeBag.cert || null;
                     }
                 }
            }
        }

        if (!privateKey || !certificate) {
            throw new Error('Certificado PFX incompleto: Chave privada ou certificado público ausentes.');
        }

        // Convert to PEM
        let privateKeyPem = forge.pki.privateKeyToPem(privateKey);
        let certificatePem = forge.pki.certificateToPem(certificate);

        // ABRASF signature requires clean certificate bodies for XML (No headers)
        return {
            privateKeyPem,
            certificatePem: cleanPem(certificatePem),
            certNodeForge: certificate
        };
    } catch (error: any) {
        console.error('Erro ao extrair PFX:', error);
        throw new Error('Falha ao processar o certificado. Verifique a senha e o arquivo.');
    }
}

/**
 * Removes standard BEGIN and END headers from PEM, returning only the clean Base64 lines
 */
export function cleanPem(pem: string): string {
    return pem.replace(/-----BEGIN [^-]+-----/g, '')
              .replace(/-----END [^-]+-----/g, '')
              .replace(/\r?\n/g, '') // remove new lines for inline xml injection
              .trim();
}
