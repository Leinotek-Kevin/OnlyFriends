import React, { useState } from "react";
import "../../styles/drink-carousel.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

const Carousel = () => {
  const items = [
    {
      image: "/images/drinks/wine.jpg",
      title: "紅酒",
      description: "情感豐富、重視深度連結、敏感細膩",
    },
    {
      image: "/images/drinks/precious-milk.jpg",
      title: "珍珠奶茶",
      description: "重視關係和諧、善於照顧他人、需要歸屬感",
    },
    {
      image: "/images/drinks/sparkling-water.jpg",
      title: "氣泡水",
      description: "開朗外向、喜愛熱鬧、適應力強",
    },
    {
      image: "/images/drinks/black-coffee.jpg",
      title: "黑咖啡",
      description: "邏輯清晰、重視效率、需要個人空間",
    },
    {
      image: "/images/drinks/orange-juice.jpg",
      title: "柳橙汁",
      description: "積極樂觀、行動力強、喜歡帶領他人",
    },
    {
      image: "/images/drinks/match-latte.jpg",
      title: "抹茶拿鐵",
      description: "善解人意、追求平衡、具有包容力",
    },
    {
      image: "/images/drinks/whisky.jpg",
      title: "威士忌",
      description: "原則性強、獨立自主、不輕易妥協",
    },
    {
      image: "/images/drinks/milk-shake.jpg",
      title: "奶昔",
      description: "關懷他人、情感豐富、渴望被需要",
    },
    {
      image: "/images/drinks/green-tea.jpg",
      title: "綠茶",
      description: "內向穩重、善於觀察、需要獨處時間",
    },
    {
      image: "/images/drinks/hot-cocoa.jpg",
      title: "熱可可",
      description: "敏感體貼、內心柔軟、重視情感安全",
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="carousel-container">
      <Swiper
        modules={[Autoplay, Pagination, Navigation]}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        centeredSlides={true}
        slidesPerView={3}
        loop={true}
        spaceBetween={20}
        // pagination={{ clickable: true }}
        // navigation={true}
        onSlideChange={(swiper) => {
          setActiveIndex(swiper.realIndex); // 取得目前實際 index
        }}
        onSwiper={(swiper) => {
          setActiveIndex(swiper.realIndex); // 初始化 index
        }}
        breakpoints={{
          350: {
            slidesPerView: 3,
            spaceBetween: 0,
          },
        }}
      >
        {items.map((item, index) => (
          <SwiperSlide key={index}>
            <div className="carousel-slide">
              <img src={item.image} alt={item.text} />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* 文字放在 Swiper 外面 */}
      <div className="carousel-text">
        <p className="drink-title">{items[activeIndex].title}</p>
        <p className="drink-desc">{items[activeIndex].description}</p>
      </div>
    </div>
  );
};

export default Carousel;
