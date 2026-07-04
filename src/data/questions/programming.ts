import type { Question } from '@/types/game';

export const programmingQuestions: Question[] = [
  // extended to 15 questions
  {
    id: 'prog_001',
    theme: 'programming',
    question: 'Apa itu variable dalam pemrograman?',
    options: [
      'Sebuah objek yang tidak dapat diubah nilainya',
      'Sebuah penampung untuk menyimpan nilai atau data',
      'Sebuah fungsi yang digunakan untuk perhitungan',
      'Sebuah loop yang mengulang perintah'
    ],
    correctAnswer: 1,
    difficulty: 'easy'
  },
  {
    id: 'prog_002',
    theme: 'programming',
    question: 'Dalam bahasa pemrograman, apa itu function (fungsi)?',
    options: [
      'Sebuah blok kode yang dapat digunakan kembali',
      'Sebuah tipe data',
      'Sebuah operator matematika',
      'Sebuah loop statement'
    ],
    correctAnswer: 0,
    difficulty: 'easy'
  },
  {
    id: 'prog_003',
    theme: 'programming',
    question: 'Apa yang dimaksud dengan "loop" dalam pemrograman?',
    options: [
      'Sebuah percabangan kode',
      'Sebuah pengulangan blok kode sampai kondisi terpenuhi',
      'Sebuah deklarasi variabel',
      'Sebuah tipe data array'
    ],
    correctAnswer: 1,
    difficulty: 'easy'
  },
  {
    id: 'prog_004',
    theme: 'programming',
    question: 'Bahasa pemrograman apa yang paling sering digunakan untuk web development?',
    options: [
      'Python',
      'C++',
      'JavaScript',
      'Assembly'
    ],
    correctAnswer: 2,
    difficulty: 'easy'
  },
  {
    id: 'prog_005',
    theme: 'programming',
    question: 'Apa itu array dalam pemrograman?',
    options: [
      'Sebuah variabel yang menyimpan satu nilai',
      'Sebuah koleksi elemen dengan tipe data yang sama',
      'Sebuah fungsi untuk perhitungan',
      'Sebuah operator perbandingan'
    ],
    correctAnswer: 1,
    difficulty: 'medium'
  },
  {
    id: 'prog_006',
    theme: 'programming',
    question: 'Apa perbedaan antara "==" dan "===" dalam JavaScript?',
    options: [
      'Tidak ada perbedaan',
      '"==" membandingkan nilai, "===" membandingkan nilai dan tipe data',
      '"===" membandingkan nilai, "==" membandingkan nilai dan tipe data',
      'Keduanya digunakan untuk assignment'
    ],
    correctAnswer: 1,
    difficulty: 'medium'
  },
  {
    id: 'prog_007',
    theme: 'programming',
    question: 'Apa itu database?',
    options: [
      'Sebuah program untuk mengedit gambar',
      'Sebuah tempat penyimpanan data yang terorganisir',
      'Sebuah bahasa pemrograman',
      'Sebuah tool untuk debugging'
    ],
    correctAnswer: 1,
    difficulty: 'easy'
  },
  {
    id: 'prog_008',
    theme: 'programming',
    question: 'Apa itu API (Application Programming Interface)?',
    options: [
      'Sebuah tool untuk membuat animasi',
      'Sebuah antarmuka untuk komunikasi antar program',
      'Sebuah jenis database',
      'Sebuah bahasa markup'
    ],
    correctAnswer: 1,
    difficulty: 'medium'
  },
  {
    id: 'prog_009',
    theme: 'programming',
    question: 'Apa itu Git dalam pengembangan software?',
    options: [
      'Sebuah bahasa pemrograman',
      'Sebuah sistem version control untuk melacak perubahan kode',
      'Sebuah text editor',
      'Sebuah compiler'
    ],
    correctAnswer: 1,
    difficulty: 'medium'
  },
  {
    id: 'prog_010',
    theme: 'programming',
    question: 'Apa itu OOP (Object-Oriented Programming)?',
    options: [
      'Sebuah jenis database',
      'Sebuah paradigma pemrograman berbasis objek dan class',
      'Sebuah tool untuk debugging',
      'Sebuah protokol internet'
    ],
    correctAnswer: 1,
    difficulty: 'hard'
  },
  {
    id: 'prog_011',
    theme: 'programming',
    question: 'Apa itu closure dalam JavaScript?',
    options: [
      'Sebuah cara untuk menutup program',
      'Sebuah fungsi yang memiliki akses ke variabel di scope induknya',
      'Sebuah jenis loop',
      'Sebuah tipe data'
    ],
    correctAnswer: 1,
    difficulty: 'hard'
  },
  {
    id: 'prog_012',
    theme: 'programming',
    question: 'Apa itu REST API?',
    options: [
      'Sebuah teknik istirahat dalam programming',
      'Sebuah arsitektur untuk membangun web service menggunakan HTTP',
      'Sebuah bahasa pemrograman',
      'Sebuah tool untuk testing'
    ],
    correctAnswer: 1,
    difficulty: 'hard'
  }
  ,
  {
    id: 'prog_013',
    theme: 'programming',
    question: 'Apa itu asynchronous programming?',
    options: ['Eksekusi berturut-turut', 'Eksekusi paralel tanpa blocking', 'Program yang selalu berjalan', 'Program yang crash'],
    correctAnswer: 1,
    difficulty: 'medium'
  },
  {
    id: 'prog_014',
    theme: 'programming',
    question: 'Apa itu recursion?',
    options: ['Fungsi memanggil dirinya sendiri', 'Perulangan for', 'Tipe data baru', 'Method untuk debug'],
    correctAnswer: 0,
    difficulty: 'hard'
  },
  {
    id: 'prog_015',
    theme: 'programming',
    question: 'Manakah contoh bahasa pemrograman berorientasi objek?',
    options: ['C', 'Haskell', 'Java', 'Bash'],
    correctAnswer: 2,
    difficulty: 'easy'
  }
];
