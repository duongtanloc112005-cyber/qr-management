const fs = require('fs');
const path = require('path');

// Generate large test data for stress testing
function generateTestData(count = 5000) {
  const data = [];
  const loaiHangOptions = ['tee', 'boxy', 'scc', 'skk', 'hd', 'zip', 'swt', 'bb', 'polo'];
  const loaiSXOptions = ['in', 'kt', 'theu', 'dtg', 'tp', 'khac'];
  const dotHangOptions = ['sp1', 'sp2', 'sp3', 'sp4', 'sp5', 'spht', 'ctv', 'mvd'];
  const mauOptions = ['trang', 'den', 'xanh', 'do', 'hong', 'nau'];
  const sizeOptions = ['S', 'M', 'L', 'XL', 'XXL'];

  for (let i = 0; i < count; i++) {
    const loaiHang = loaiHangOptions[Math.floor(Math.random() * loaiHangOptions.length)];
    const loaiSX = loaiSXOptions[Math.floor(Math.random() * loaiSXOptions.length)];
    const dotHang = dotHangOptions[Math.floor(Math.random() * dotHangOptions.length)];
    const mau = mauOptions[Math.floor(Math.random() * mauOptions.length)];
    const size = sizeOptions[Math.floor(Math.random() * sizeOptions.length)];

    data.push({
      maGoc: `TEST${String(i + 1).padStart(4, '0')}=${loaiHang}-${loaiSX}|Sample ${mau} ${size}`,
      ma: `TEST${String(i + 1).padStart(4, '0')}=${loaiHang}-${loaiSX}|Sample ${mau} ${size}`,
      trangThai: 'In & thêu',
      dotHang: dotHang,
      loaiHang: loaiHang,
      loaiSX: loaiSX,
      mau: mau,
      size: size,
      thoiGian: new Date().toISOString(),
      ghiChu: `Test record ${i + 1}`,
      ngayTao: new Date().toISOString()
    });
  }

  return data;
}

// Generate and save test data
const testData = generateTestData(5000);
const dataDir = path.join(__dirname, 'data');
const testFile = path.join(dataDir, 'sanxuat-test.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(testFile, JSON.stringify({
  timestamp: new Date().toISOString(),
  data: testData
}, null, 2));

console.log(`Generated 5000 test records in ${testFile}`);