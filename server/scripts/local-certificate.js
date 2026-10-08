const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
function createCertificate(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const key = path.join(directory, 'localhost-key.pem'), cert = path.join(directory, 'localhost.pem');
  const candidates = [process.env.OPENSSL_PATH, 'openssl', 'C:/Program Files/Git/usr/bin/openssl.exe'].filter(Boolean);
  const openssl = candidates.find(file => { try { execFileSync(file, ['version'], { stdio: 'ignore', windowsHide: true }); return true; } catch { return false; } });
  if (!openssl) throw new Error('Install OpenSSL or set OPENSSL_PATH. No certificate trust settings have been changed.');
  execFileSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes', '-days', '30',
    '-keyout', key, '-out', cert, '-subj', '/CN=Fabulari localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-addext', 'basicConstraints=critical,CA:FALSE',
    '-addext', 'keyUsage=critical,digitalSignature,keyEncipherment',
    '-addext', 'extendedKeyUsage=serverAuth'], { stdio: 'ignore', windowsHide: true });
  execFileSync(openssl, ['x509', '-in', cert, '-outform', 'DER', '-out', path.join(directory, 'localhost.cer')], { stdio: 'ignore', windowsHide: true });
  return { key, cert };
}
if (require.main === module) {
  const directory = path.resolve(__dirname, '../.certs');
  if (fs.existsSync(path.join(directory, 'localhost-key.pem'))) throw new Error('A local key already exists; it was not replaced.');
  createCertificate(directory);
  console.log('Created a 30-day localhost-only certificate in server/.certs. No trust store was changed.');
}
module.exports = { createCertificate };
