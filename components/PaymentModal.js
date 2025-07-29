import { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native"; 
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Button from "./ui/Button";
import { theme } from "../config/theme";
import { PLANS } from "../utils/constants";

const PaymentModal = ({ visible, onClose, onPaymentSuccess }) => {
  const [selectedPlan, setSelectedPlan] = useState(
    PLANS[0]?.name || "20-Min Vent"
  ); // Default to first plan or "20-Min Vent"
  const [processing, setProcessing] = useState(false);

  const plans = PLANS;

  const handlePayment = useCallback(async () => {
    setProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      Alert.alert(
        "Payment Successful",
        `You have successfully purchased ${selectedPlan}. Preparing your session...`,
        [
          {
            text: "Continue",
            onPress: () => {
              onPaymentSuccess(selectedPlan);
              onClose(); // onClose will be called by DashboardScreen after payment success processing
            },
          },
        ]
      );
    } catch (error) {
      console.error("Payment processing error:", error);
      Alert.alert(
        "Payment Failed",
        "There was an issue processing your payment. Please try again later."
      );
    } finally {
      setProcessing(false);
    }
  }, [selectedPlan, onPaymentSuccess]);

  const PlanCard = useCallback(
    ({ plan }) => (
      <TouchableOpacity
        style={[
          styles.planCard,
          selectedPlan === plan.name && styles.selectedPlan,
        ]}
        onPress={() => setSelectedPlan(plan.name)}
        disabled={processing}
      >
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planDescription}>{plan.description}</Text>
          </View>
          {plan.popular && (
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>Popular</Text>
            </View>
          )}
        </View>

        <View style={styles.planDetails}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planDuration}>
            {plan.durationInMinutes} minutes
          </Text>
         
        </View>

        {selectedPlan === plan.name && (
          <View style={styles.checkmark}>
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={theme.colors.success}
            />
            
          </View>
        )}
      </TouchableOpacity>
    ),
    [selectedPlan, processing, theme.colors.success]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient colors={["#1a1a40", "#0f0f2e"]} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            disabled={processing}
          >
            
            {/* Disable close during processing */}
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            Select a plan to start your anonymous vent session
          </Text>

          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </View>

          <View style={styles.features}>
            <Text style={styles.featuresTitle}>What's included:</Text>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark"
                size={20}
                color={theme.colors.success}
              />
              <Text style={styles.featureText}>Anonymous voice session</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark"
                size={20}
                color={theme.colors.success}
              />
              <Text style={styles.featureText}>
                Matched with trained listener
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark"
                size={20}
                color={theme.colors.success}
              />
              <Text style={styles.featureText}>End-to-end encrypted</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons
                name="checkmark"
                size={20}
                color={theme.colors.success}
              />
              <Text style={styles.featureText}>No recording or storage</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={
              processing
                ? "Processing..."
                : `Pay ${plans.find((p) => p.name === selectedPlan)?.price || "N/A"}`
            }
            onPress={handlePayment}
            disabled={processing}
            loading={processing}
            // You might want to pass a specific variant to the Button component
            variant="primary" // Assuming you have 'primary' variant
          />

          <Text style={styles.disclaimer}>
            Secure payment processed by Stripe. Cancel anytime.
          </Text>
        </View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Background gradient is handled by LinearGradient directly
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg, // Use theme spacing
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.h3.fontSize, // Use theme typography
    fontWeight: "bold",
    color: theme.colors.text.primary, // Use theme color
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    textAlign: "center",
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  plansContainer: {
    marginBottom: theme.spacing.xl,
  },
  planCard: {
    backgroundColor: theme.colors.overlay, // Use theme color
    borderRadius: theme.borderRadius.xl, // Use theme border radius
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
    ...theme.shadows.small, // Apply theme shadows
  },
  selectedPlan: {
    borderColor: theme.colors.primary, // Use theme color
    backgroundColor: theme.colors.primaryTransparent, // Assuming you have a transparent primary color in theme
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  planName: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  planDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.secondary,
  },
  popularBadge: {
    backgroundColor: theme.colors.accent, // Use theme color for accent
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  popularText: {
    fontSize: theme.typography.small.fontSize,
    fontWeight: "600",
    color: theme.colors.text.dark, // Assuming a dark text color for badges
  },
  planDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  planPrice: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  planDuration: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
  },
  checkmark: {
    position: "absolute",
    top: 15,
    right: 15,
  },
  features: {
    backgroundColor: theme.colors.overlay, // Use theme color
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  featuresTitle: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  featureText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.sm,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, 
    borderTopColor: theme.colors.border, 
  },
  disclaimer: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.text.tertiary,
    textAlign: "center",
    marginTop: theme.spacing.md,
    lineHeight: 16,
  },
});

export default PaymentModal;
