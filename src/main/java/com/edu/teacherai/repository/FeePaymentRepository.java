package com.edu.teacherai.repository;
import com.edu.teacherai.entity.FeePayment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface FeePaymentRepository extends JpaRepository<FeePayment, Long> {
    Optional<FeePayment> findByOrderId(String orderId);
    Optional<FeePayment> findByOrderIdAndSchoolId(String orderId, Long schoolId);
    List<FeePayment> findBySchoolIdOrderByCreatedAtDesc(Long schoolId);
}
