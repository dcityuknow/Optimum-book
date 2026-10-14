# Optimum – sách tương tác 3D

Mở `index.html` trực tiếp (không cần server, không cần mạng; chỉ font Google là tuỳ chọn).

```
index.html            nội dung 30 trang (sửa chữ/ảnh ở đây)
css/                  base · book (sách 3D) · content (trang, hình) · hologram
js/kit.js             tiện ích Three.js (glow, nhãn chữ...)
js/models-core.js     registry mô hình + tạo poster tĩnh
js/models/*.js        12 mô hình 3D (mỗi tệp 1 mô hình)
js/hologram.js        mô hình bật lên khỏi trang (tối đa 2 cùng lúc)
js/book.js            engine lật trang / xoay / zoom
js/main.js            khởi động
assets/img/*.svg      16 ảnh minh hoạ động
vendor/three.min.js   three.js r128 (offline)
```

Thêm mô hình 3D mới: tạo `js/models/ten.js` gọi `OPT.registerModel('ten', (scene, camera) => tick)`,
thêm `<script>` vào index.html, rồi đặt `<figure class="m3d" data-model="ten"><img alt=""><span class="tag">3D</span></figure>` vào trang.
